"""
Power BI Embedded API routes — Phase 6.
"""
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.powerbi.powerbi_service import (
    create_report, list_reports, get_report, delete_report,
    get_embed_token, is_powerbi_configured,
)
from app.domains.powerbi.schemas import (
    CreatePowerBIReportRequest, PowerBIReportResponse, EmbedTokenResponse,
)

router = APIRouter(prefix="/powerbi", tags=["Power BI Embedded"])


@router.get("/status")
async def pbi_status():
    """Check whether Power BI credentials are configured."""
    return {
        "configured": is_powerbi_configured(),
        "message": (
            "Power BI integration is active."
            if is_powerbi_configured()
            else "Set POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET, and POWERBI_TENANT_ID to enable embedding."
        ),
    }


@router.post("/reports", response_model=PowerBIReportResponse, status_code=status.HTTP_201_CREATED)
async def register_report(
    body: CreatePowerBIReportRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Register a Power BI report for embedding."""
    report = await create_report(
        owner_id=uuid.UUID(user_id),
        name=body.name,
        workspace_id=body.workspace_id,
        report_id=body.report_id,
        db=db,
        description=body.description,
        dataset_id=body.dataset_id,
        organization_id=body.organization_id,
    )
    return report


@router.get("/reports", response_model=list[PowerBIReportResponse])
async def get_reports(
    org_id: uuid.UUID | None = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all registered Power BI reports for the current user or org."""
    return await list_reports(uuid.UUID(user_id), db, organization_id=org_id)


@router.delete("/reports/{report_db_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_report(
    report_db_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await delete_report(report_db_id, uuid.UUID(user_id), db)


@router.post("/reports/{report_db_id}/embed-token", response_model=EmbedTokenResponse)
async def generate_embed_token(
    report_db_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate (or return cached) embed token for a registered report.
    Token is valid for 55 minutes and cached in memory to avoid Azure rate limits.
    Returns HTTP 503 when Power BI credentials are not configured.
    """
    report = await get_report(report_db_id, uuid.UUID(user_id), db)
    return await get_embed_token(report, db)
