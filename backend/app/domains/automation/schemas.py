"""
Automation Pydantic schemas — Phase 5.
"""
import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, HttpUrl

from app.db.models.automation import AutomationEventType, AutomationRunStatus


# ── Request schemas ────────────────────────────────────────────────────────────

class CreateAutomationRequest(BaseModel):
    name: str
    description: str | None = None
    event_type: AutomationEventType
    webhook_url: str
    headers: dict[str, str] | None = None
    organization_id: uuid.UUID | None = None


class UpdateAutomationRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    webhook_url: str | None = None
    headers: dict[str, str] | None = None
    is_active: bool | None = None


# ── Response schemas ───────────────────────────────────────────────────────────

class AutomationResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    event_type: AutomationEventType
    webhook_url: str
    headers: dict | None
    is_active: bool
    organization_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class AutomationRunResponse(BaseModel):
    id: uuid.UUID
    automation_id: uuid.UUID
    status: AutomationRunStatus
    event_type: str
    trigger_payload: dict | None
    response_payload: dict | None
    http_status_code: int | None
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}
