"""
Automation service — Phase 5.

Responsibilities:
  - CRUD for Automation records (webhook configs)
  - Fire webhooks asynchronously via httpx, record AutomationRun
  - Event-trigger helpers called from dataset_service and intelligence_service

Webhook dispatch is fire-and-forget from the caller's perspective: the
trigger helpers schedule the HTTP POST in the background and immediately
return so the main request is not blocked.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.db.models.automation import (
    Automation, AutomationRun,
    AutomationEventType, AutomationRunStatus,
)

logger = logging.getLogger(__name__)

# ── CRUD ──────────────────────────────────────────────────────────────────────

async def create_automation(
    owner_id: uuid.UUID,
    name: str,
    event_type: AutomationEventType,
    webhook_url: str,
    db: AsyncSession,
    description: str | None = None,
    headers: dict | None = None,
    organization_id: uuid.UUID | None = None,
) -> Automation:
    automation = Automation(
        created_by=owner_id,
        organization_id=organization_id,
        name=name.strip(),
        description=description,
        event_type=event_type,
        webhook_url=webhook_url,
        headers=headers or {},
        is_active=True,
    )
    db.add(automation)
    await db.flush()
    return automation


async def list_automations(
    owner_id: uuid.UUID,
    db: AsyncSession,
    organization_id: uuid.UUID | None = None,
) -> list[Automation]:
    """List automations belonging to this user (or their org)."""
    conditions = [Automation.created_by == owner_id]
    if organization_id:
        conditions = [Automation.organization_id == organization_id]
    result = await db.execute(
        select(Automation)
        .where(*conditions)
        .order_by(desc(Automation.created_at))
    )
    return list(result.scalars().all())


async def get_automation(
    automation_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
) -> Automation:
    automation = await db.scalar(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.created_by == owner_id,
        )
    )
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")
    return automation


async def update_automation(
    automation_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
    name: str | None = None,
    description: str | None = None,
    webhook_url: str | None = None,
    headers: dict | None = None,
    is_active: bool | None = None,
) -> Automation:
    automation = await get_automation(automation_id, owner_id, db)
    if name is not None:
        automation.name = name.strip()
    if description is not None:
        automation.description = description
    if webhook_url is not None:
        automation.webhook_url = webhook_url
    if headers is not None:
        automation.headers = headers
    if is_active is not None:
        automation.is_active = is_active
    await db.flush()
    return automation


async def delete_automation(
    automation_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    automation = await get_automation(automation_id, owner_id, db)
    await db.delete(automation)


async def list_automation_runs(
    automation_id: uuid.UUID,
    owner_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 50,
) -> list[AutomationRun]:
    # Verify ownership first
    await get_automation(automation_id, owner_id, db)
    result = await db.execute(
        select(AutomationRun)
        .where(AutomationRun.automation_id == automation_id)
        .order_by(desc(AutomationRun.created_at))
        .limit(limit)
    )
    return list(result.scalars().all())


# ── Webhook dispatch ───────────────────────────────────────────────────────────

async def _dispatch_webhook(
    automation: Automation,
    payload: dict[str, Any],
    db: AsyncSession,
) -> None:
    """
    Send an HTTP POST to the configured webhook URL and record the run.
    Called in a background task — errors are logged, not raised.
    """
    run = AutomationRun(
        automation_id=automation.id,
        event_type=automation.event_type.value,
        trigger_payload=payload,
        status=AutomationRunStatus.RUNNING,
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    await db.flush()

    headers = {"Content-Type": "application/json"}
    if automation.headers:
        headers.update(automation.headers)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(automation.webhook_url, json=payload, headers=headers)

        run.http_status_code = response.status_code
        run.response_payload = _safe_parse_response(response)
        run.status = (
            AutomationRunStatus.SUCCESS if response.is_success else AutomationRunStatus.FAILED
        )
        if not response.is_success:
            run.error_message = f"HTTP {response.status_code}: {response.text[:500]}"

    except httpx.TimeoutException:
        run.status = AutomationRunStatus.FAILED
        run.error_message = "Webhook timed out after 15 seconds"
        logger.warning("Automation %s timed out — url=%s", automation.id, automation.webhook_url)

    except Exception as exc:
        run.status = AutomationRunStatus.FAILED
        run.error_message = str(exc)[:500]
        logger.exception("Automation %s dispatch error", automation.id)

    finally:
        run.completed_at = datetime.now(timezone.utc)
        await db.commit()


def _safe_parse_response(response: httpx.Response) -> dict | None:
    try:
        return response.json()
    except Exception:
        text = response.text[:500]
        return {"raw": text} if text else None


# ── Event triggers (called from other services) ────────────────────────────────

async def fire_event(
    event_type: AutomationEventType,
    payload: dict[str, Any],
    owner_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Find all active automations for this event type + owner and dispatch them.
    Designed to be awaited in a background task — never raises to caller.
    """
    try:
        result = await db.execute(
            select(Automation).where(
                Automation.created_by == owner_id,
                Automation.event_type == event_type,
                Automation.is_active == True,  # noqa: E712
            )
        )
        automations = list(result.scalars().all())
        for automation in automations:
            try:
                await _dispatch_webhook(automation, payload, db)
            except Exception:
                logger.exception("Failed to dispatch automation %s", automation.id)
    except Exception:
        logger.exception("fire_event(%s) error — skipping automation dispatch", event_type)
