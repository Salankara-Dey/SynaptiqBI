"""
Tests for Phase 6 — Power BI Embedded service.
"""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone

from app.domains.powerbi.schemas import EmbedTokenResponse


# ── Unit tests — powerbi_service ──────────────────────────────────────────────

def test_is_configured_false_when_creds_missing():
    """is_powerbi_configured returns False when any credential is empty."""
    with patch("app.domains.powerbi.powerbi_service.settings") as mock_settings:
        mock_settings.POWERBI_CLIENT_ID = ""
        mock_settings.POWERBI_CLIENT_SECRET = "secret"
        mock_settings.POWERBI_TENANT_ID = "tenant"

        from app.domains.powerbi import powerbi_service
        # Reload to pick up patched settings
        assert powerbi_service._is_configured() is False


def test_is_configured_true_when_all_creds_present():
    with patch("app.domains.powerbi.powerbi_service.settings") as mock_settings:
        mock_settings.POWERBI_CLIENT_ID = "client-id"
        mock_settings.POWERBI_CLIENT_SECRET = "secret"
        mock_settings.POWERBI_TENANT_ID = "tenant-id"

        from app.domains.powerbi import powerbi_service
        assert powerbi_service._is_configured() is True


@pytest.mark.asyncio
async def test_get_azure_access_token_raises_503_when_unconfigured():
    """_get_azure_access_token must raise HTTP 503 when creds are missing."""
    from fastapi import HTTPException
    with patch("app.domains.powerbi.powerbi_service._is_configured", return_value=False):
        from app.domains.powerbi.powerbi_service import _get_azure_access_token
        with pytest.raises(HTTPException) as exc:
            await _get_azure_access_token()
        assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_get_azure_access_token_success():
    """_get_azure_access_token returns token string on successful Azure call."""
    import httpx
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_success = True
    mock_response.json.return_value = {"access_token": "azure-access-token-xyz"}

    with patch("app.domains.powerbi.powerbi_service._is_configured", return_value=True):
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)

            from app.domains.powerbi.powerbi_service import _get_azure_access_token
            token = await _get_azure_access_token()

    assert token == "azure-access-token-xyz"


@pytest.mark.asyncio
async def test_get_azure_access_token_raises_502_on_azure_error():
    """_get_azure_access_token raises 502 when Azure returns an error."""
    import httpx
    from fastapi import HTTPException
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_success = False
    mock_response.status_code = 401
    mock_response.text = "Unauthorized"

    with patch("app.domains.powerbi.powerbi_service._is_configured", return_value=True):
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)

            from app.domains.powerbi.powerbi_service import _get_azure_access_token
            with pytest.raises(HTTPException) as exc:
                await _get_azure_access_token()
            assert exc.value.status_code == 502


@pytest.mark.asyncio
async def test_embed_token_cache_hit():
    """get_embed_token returns cached token without calling Azure."""
    from app.domains.powerbi import powerbi_service

    report = MagicMock()
    report.id = uuid.uuid4()
    report.report_id = "pbi-report-id"
    report.workspace_id = "ws-id"
    report.dataset_id = None
    report.embed_url = None

    future_expiry = datetime.now(timezone.utc) + timedelta(minutes=30)
    cached_token = EmbedTokenResponse(
        report_id="pbi-report-id",
        embed_url="https://embed.powerbi.com/test",
        embed_token="cached-embed-token",
        token_expiry=future_expiry,
        cached=False,
    )
    powerbi_service._token_cache[str(report.id)] = cached_token

    db = AsyncMock()
    result = await powerbi_service.get_embed_token(report, db)

    assert result.embed_token == "cached-embed-token"
    assert result.cached is True

    # Cleanup
    del powerbi_service._token_cache[str(report.id)]


@pytest.mark.asyncio
async def test_embed_token_cache_miss_calls_azure():
    """get_embed_token calls Azure when cache is empty."""
    from app.domains.powerbi import powerbi_service

    report = MagicMock()
    report.id = uuid.uuid4()
    report.report_id = "rpt-abc"
    report.workspace_id = "ws-abc"
    report.dataset_id = "ds-abc"
    report.embed_url = None

    powerbi_service._token_cache.pop(str(report.id), None)

    import httpx
    mock_azure_response = MagicMock(spec=httpx.Response)
    mock_azure_response.is_success = True
    mock_azure_response.json.return_value = {"access_token": "az-token"}

    mock_pbi_response = MagicMock(spec=httpx.Response)
    mock_pbi_response.is_success = True
    mock_pbi_response.json.return_value = {
        "token": "embed-token-fresh",
        "embedUrl": "https://embed.powerbi.com/fresh",
    }

    call_count = {"n": 0}

    async def mock_post(url, **kwargs):
        call_count["n"] += 1
        if "microsoftonline" in url:
            return mock_azure_response
        return mock_pbi_response

    db = AsyncMock()
    db.flush = AsyncMock()

    with patch("app.domains.powerbi.powerbi_service._is_configured", return_value=True):
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=mock_post)
            MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)

            result = await powerbi_service.get_embed_token(report, db)

    assert result.embed_token == "embed-token-fresh"
    assert result.cached is False
    assert call_count["n"] == 2  # one Azure AD + one PBI call

    # Cleanup
    powerbi_service._token_cache.pop(str(report.id), None)


@pytest.mark.asyncio
async def test_get_report_raises_404():
    """get_report raises 404 when report not found."""
    from fastapi import HTTPException
    from sqlalchemy.ext.asyncio import AsyncSession

    db = AsyncMock(spec=AsyncSession)
    db.scalar = AsyncMock(return_value=None)

    from app.domains.powerbi.powerbi_service import get_report
    with pytest.raises(HTTPException) as exc:
        await get_report(uuid.uuid4(), uuid.uuid4(), db)
    assert exc.value.status_code == 404
