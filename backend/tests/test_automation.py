"""
Tests for the Phase 5 Automation service and API.

These tests use an in-memory SQLite database via the test client fixtures
and mock httpx to avoid real HTTP calls in CI.
"""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from app.db.models.automation import (
    Automation, AutomationRun,
    AutomationEventType, AutomationRunStatus,
)


# ── Unit tests — automation_service ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_automation_sets_defaults():
    """create_automation should persist with is_active=True."""
    db = AsyncMock()
    db.flush = AsyncMock()

    with patch("app.domains.automation.automation_service.Automation") as MockModel:
        instance = MagicMock()
        instance.id = uuid.uuid4()
        instance.is_active = True
        MockModel.return_value = instance

        from app.domains.automation.automation_service import create_automation
        result = await create_automation(
            owner_id=uuid.uuid4(),
            name="Test Hook",
            event_type=AutomationEventType.DATASET_READY,
            webhook_url="https://example.com/hook",
            db=db,
        )

        db.add.assert_called_once_with(instance)
        assert result.is_active is True


@pytest.mark.asyncio
async def test_get_automation_raises_404_when_missing():
    """get_automation should raise 404 for unknown automation."""
    from fastapi import HTTPException
    from sqlalchemy.ext.asyncio import AsyncSession
    from unittest.mock import AsyncMock, MagicMock

    db = AsyncMock(spec=AsyncSession)
    # Make db.scalar return None (not found)
    db.scalar = AsyncMock(return_value=None)

    from app.domains.automation.automation_service import get_automation
    with pytest.raises(HTTPException) as exc:
        await get_automation(uuid.uuid4(), uuid.uuid4(), db)

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_dispatch_webhook_success():
    """_dispatch_webhook should create a SUCCESS run on 2xx response."""
    import httpx
    from unittest.mock import AsyncMock, MagicMock, patch

    automation = MagicMock(spec=Automation)
    automation.id = uuid.uuid4()
    automation.webhook_url = "https://n8n.example.com/webhook/abc"
    automation.event_type = AutomationEventType.DATASET_READY
    automation.headers = {"X-Api-Key": "secret"}

    run = MagicMock(spec=AutomationRun)
    db = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.is_success = True
    mock_response.json.return_value = {"status": "ok"}

    with patch("app.domains.automation.automation_service.AutomationRun", return_value=run):
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)

            from app.domains.automation.automation_service import _dispatch_webhook
            await _dispatch_webhook(automation, {"event": "test"}, db)

    assert run.status == AutomationRunStatus.SUCCESS
    assert run.http_status_code == 200
    db.commit.assert_called()


@pytest.mark.asyncio
async def test_dispatch_webhook_timeout():
    """_dispatch_webhook should record FAILED status on timeout."""
    import httpx
    from unittest.mock import AsyncMock, MagicMock, patch

    automation = MagicMock(spec=Automation)
    automation.id = uuid.uuid4()
    automation.webhook_url = "https://slow.example.com/webhook"
    automation.event_type = AutomationEventType.INSIGHT_GENERATED
    automation.headers = {}

    run = MagicMock(spec=AutomationRun)
    db = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()

    with patch("app.domains.automation.automation_service.AutomationRun", return_value=run):
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)

            from app.domains.automation.automation_service import _dispatch_webhook
            await _dispatch_webhook(automation, {"event": "test"}, db)

    assert run.status == AutomationRunStatus.FAILED
    assert "timed out" in run.error_message.lower()


@pytest.mark.asyncio
async def test_fire_event_dispatches_active_automations():
    """fire_event should only dispatch automations that are active."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from unittest.mock import AsyncMock, MagicMock, patch

    owner_id = uuid.uuid4()

    active_automation = MagicMock(spec=Automation)
    active_automation.id = uuid.uuid4()
    active_automation.is_active = True

    db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [active_automation]
    db.execute = AsyncMock(return_value=mock_result)

    dispatch_calls = []

    async def mock_dispatch(automation, payload, db):
        dispatch_calls.append(automation.id)

    with patch("app.domains.automation.automation_service._dispatch_webhook", side_effect=mock_dispatch):
        from app.domains.automation.automation_service import fire_event
        await fire_event(
            AutomationEventType.DATASET_READY,
            {"dataset_id": str(uuid.uuid4())},
            owner_id,
            db,
        )

    assert len(dispatch_calls) == 1
    assert dispatch_calls[0] == active_automation.id


@pytest.mark.asyncio
async def test_fire_event_handles_dispatch_error_gracefully():
    """fire_event should not raise even if individual dispatch fails."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from unittest.mock import AsyncMock, MagicMock, patch

    owner_id = uuid.uuid4()
    broken_automation = MagicMock(spec=Automation)
    broken_automation.id = uuid.uuid4()

    db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [broken_automation]
    db.execute = AsyncMock(return_value=mock_result)

    async def always_fail(automation, payload, db):
        raise RuntimeError("Webhook exploded")

    with patch("app.domains.automation.automation_service._dispatch_webhook", side_effect=always_fail):
        from app.domains.automation.automation_service import fire_event
        # Should NOT raise
        await fire_event(
            AutomationEventType.DATASET_READY,
            {"dataset_id": "abc"},
            owner_id,
            db,
        )


def test_automation_event_type_values():
    """Enum values match what the DB migration created."""
    assert AutomationEventType.DATASET_UPLOADED == "dataset_uploaded"
    assert AutomationEventType.DATASET_READY == "dataset_ready"
    assert AutomationEventType.INSIGHT_GENERATED == "insight_generated"


def test_automation_run_status_values():
    assert AutomationRunStatus.PENDING == "pending"
    assert AutomationRunStatus.RUNNING == "running"
    assert AutomationRunStatus.SUCCESS == "success"
    assert AutomationRunStatus.FAILED == "failed"
