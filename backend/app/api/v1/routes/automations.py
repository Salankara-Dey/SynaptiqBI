"""
Automation API routes — Phase 5.

CRUD for webhook automations and run history.
Event triggers are fired automatically by dataset_service and
intelligence_service — no manual trigger endpoint needed.
"""
import uuid
from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.automation.automation_service import (
    create_automation, list_automations, get_automation,
    update_automation, delete_automation, list_automation_runs,
    fire_event,
)
from app.domains.automation.schemas import (
    CreateAutomationRequest, UpdateAutomationRequest,
    AutomationResponse, AutomationRunResponse,
)
from app.db.models.automation import AutomationEventType

router = APIRouter(prefix="/automations", tags=["Automations"])


@router.post("/", response_model=AutomationResponse, status_code=status.HTTP_201_CREATED)
async def create(
    body: CreateAutomationRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new webhook automation for a platform event."""
    automation = await create_automation(
        owner_id=uuid.UUID(user_id),
        name=body.name,
        event_type=body.event_type,
        webhook_url=body.webhook_url,
        db=db,
        description=body.description,
        headers=body.headers,
        organization_id=body.organization_id,
    )
    return automation


@router.get("/", response_model=list[AutomationResponse])
async def list_all(
    org_id: uuid.UUID | None = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List automations owned by the current user (or their org)."""
    return await list_automations(uuid.UUID(user_id), db, organization_id=org_id)


@router.get("/{automation_id}", response_model=AutomationResponse)
async def get_one(
    automation_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await get_automation(automation_id, uuid.UUID(user_id), db)


@router.patch("/{automation_id}", response_model=AutomationResponse)
async def update(
    automation_id: uuid.UUID,
    body: UpdateAutomationRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update automation name, URL, headers, or active state."""
    return await update_automation(
        automation_id=automation_id,
        owner_id=uuid.UUID(user_id),
        db=db,
        name=body.name,
        description=body.description,
        webhook_url=body.webhook_url,
        headers=body.headers,
        is_active=body.is_active,
    )


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    automation_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await delete_automation(automation_id, uuid.UUID(user_id), db)


@router.get("/{automation_id}/runs", response_model=list[AutomationRunResponse])
async def get_runs(
    automation_id: uuid.UUID,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the run history (audit log) for a specific automation."""
    return await list_automation_runs(automation_id, uuid.UUID(user_id), db, limit=limit)


@router.post("/{automation_id}/test", status_code=status.HTTP_202_ACCEPTED)
async def test_webhook(
    automation_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Fire a test payload to the automation's webhook URL.
    Dispatched in the background — returns 202 immediately.
    """
    automation = await get_automation(automation_id, uuid.UUID(user_id), db)
    test_payload = {
        "event": automation.event_type.value,
        "test": True,
        "automation_id": str(automation.id),
        "automation_name": automation.name,
    }

    async def _do_test():
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as bg_db:
            from app.domains.automation.automation_service import _dispatch_webhook
            import sqlalchemy
            result = await bg_db.execute(
                sqlalchemy.select(type(automation)).where(type(automation).id == automation.id)
            )
            fresh = result.scalar_one()
            await _dispatch_webhook(fresh, test_payload, bg_db)

    background_tasks.add_task(lambda: __import__("asyncio").run(_do_test()))
    return {"message": "Test webhook dispatched", "automation_id": str(automation_id)}
