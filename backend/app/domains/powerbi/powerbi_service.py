"""
Power BI Embedded service — Phase 6.

Capabilities:
  1. CRUD for PowerBIReport records
  2. Azure AD client-credentials token acquisition (via httpx)
  3. Power BI GenerateToken REST API call
  4. In-memory embed token cache (55-minute TTL)
  5. Graceful "not configured" handling when Azure creds are absent
"""
import uuid
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.config import get_settings
from app.db.models.powerbi import PowerBIReport
from app.domains.powerbi.schemas import EmbedTokenResponse

logger = logging.getLogger(__name__)
settings = get_settings()

# ── In-memory embed token cache ───────────────────────────────────────────────
# { report_db_id -> EmbedTokenResponse }
# Keyed by our DB UUID so different orgs with same PBI report_id get separate entries.
_token_cache: dict[str, EmbedTokenResponse] = {}
_cache_lock = asyncio.Lock()

CACHE_TTL_MINUTES = 55  # PBI tokens live ~60 min; we refresh 5 min early


def _is_configured() -> bool:
    """Return True only when all required Azure creds are present."""
    return all([
        settings.POWERBI_CLIENT_ID,
        settings.POWERBI_CLIENT_SECRET,
        settings.POWERBI_TENANT_ID,
    ])


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def create_report(
    owner_id: uuid.UUID,
    name: str,
    workspace_id: str,
    report_id: str,
    db: AsyncSession,
    description: str | None = None,
    dataset_id: str | None = None,
    organization_id: uuid.UUID | None = None,
) -> PowerBIReport:
    report = PowerBIReport(
        created_by=owner_id,
        organization_id=organization_id,
        name=name.strip(),
        description=description,
        workspace_id=workspace_id,
        report_id=report_id,
        dataset_id=dataset_id,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report


async def list_reports(
    owner_id: uuid.UUID,
    db: AsyncSession,
    organization_id: uuid.UUID | None = None,
) -> list[PowerBIReport]:
    conditions = [PowerBIReport.created_by == owner_id]
    if organization_id:
        conditions = [PowerBIReport.organization_id == organization_id]
    result = await db.execute(
        select(PowerBIReport)
        .where(*conditions)
        .order_by(desc(PowerBIReport.created_at))
    )
    return list(result.scalars().all())


async def get_report(
    report_db_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
) -> PowerBIReport:
    report = await db.scalar(
        select(PowerBIReport).where(
            PowerBIReport.id == report_db_id,
            PowerBIReport.created_by == owner_id,
        )
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


async def delete_report(
    report_db_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    report = await get_report(report_db_id, owner_id, db)
    # Evict from cache
    _token_cache.pop(str(report_db_id), None)
    await db.delete(report)


# ── Azure AD token ─────────────────────────────────────────────────────────────

async def _get_azure_access_token() -> str:
    """
    Acquire an Azure AD access token for Power BI using client credentials flow.
    Raises HTTP 503 when Power BI credentials are not configured.
    """
    if not _is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Power BI integration is not configured. Set POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET, and POWERBI_TENANT_ID.",
        )

    url = f"https://login.microsoftonline.com/{settings.POWERBI_TENANT_ID}/oauth2/v2.0/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": settings.POWERBI_CLIENT_ID,
        "client_secret": settings.POWERBI_CLIENT_SECRET,
        "scope": "https://analysis.windows.net/powerbi/api/.default",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, data=payload)

    if not response.is_success:
        logger.error("Azure AD token request failed: %s %s", response.status_code, response.text[:300])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Azure AD authentication failed (HTTP {response.status_code}). Check your Power BI credentials.",
        )

    return response.json()["access_token"]


# ── Embed token ────────────────────────────────────────────────────────────────

async def _call_generate_token(
    workspace_id: str,
    report_id: str,
    dataset_id: str | None,
    azure_token: str,
) -> dict[str, Any]:
    """
    Call Power BI REST API GenerateToken endpoint.
    Returns the raw API response dict.
    """
    url = (
        f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}"
        f"/reports/{report_id}/GenerateToken"
    )
    body: dict[str, Any] = {"accessLevel": "View"}
    if dataset_id:
        body["datasetId"] = dataset_id

    headers = {
        "Authorization": f"Bearer {azure_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=body, headers=headers)

    if not response.is_success:
        logger.error("PBI GenerateToken failed: %s %s", response.status_code, response.text[:300])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Power BI GenerateToken failed (HTTP {response.status_code}). Verify workspace/report IDs and API permissions.",
        )

    return response.json()


async def get_embed_token(
    report: PowerBIReport,
    db: AsyncSession,
) -> EmbedTokenResponse:
    """
    Return a valid embed token for the given report.
    Checks the in-memory cache first; calls Azure only on cache miss or expiry.
    """
    cache_key = str(report.id)

    async with _cache_lock:
        cached = _token_cache.get(cache_key)
        if cached and cached.token_expiry > datetime.now(timezone.utc) + timedelta(minutes=2):
            logger.debug("Embed token cache hit for report %s", report.id)
            data = cached.model_dump()
            data["cached"] = True
            return EmbedTokenResponse(**data)

        # Cache miss — call Azure
        logger.info("Generating new embed token for report %s", report.id)
        azure_token = await _get_azure_access_token()
        raw = await _call_generate_token(
            report.workspace_id, report.report_id, report.dataset_id, azure_token,
        )

        embed_url = raw.get("embedUrl") or (
            f"https://app.powerbi.com/reportEmbed"
            f"?reportId={report.report_id}&groupId={report.workspace_id}"
        )
        expiry = datetime.now(timezone.utc) + timedelta(minutes=CACHE_TTL_MINUTES)

        result = EmbedTokenResponse(
            report_id=report.report_id,
            embed_url=embed_url,
            embed_token=raw["token"],
            token_expiry=expiry,
            cached=False,
        )

        _token_cache[cache_key] = result

        # Persist embed_url on the report record for display in the UI
        if not report.embed_url:
            report.embed_url = embed_url
            await db.flush()

        return result


def is_powerbi_configured() -> bool:
    return _is_configured()
