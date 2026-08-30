"""
Power BI Embedded Pydantic schemas — Phase 6.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel


class CreatePowerBIReportRequest(BaseModel):
    name: str
    description: str | None = None
    workspace_id: str
    report_id: str
    dataset_id: str | None = None
    organization_id: uuid.UUID | None = None


class PowerBIReportResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    workspace_id: str
    report_id: str
    dataset_id: str | None
    embed_url: str | None
    is_active: bool
    organization_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class EmbedTokenResponse(BaseModel):
    report_id: str
    embed_url: str
    embed_token: str
    token_expiry: datetime
    cached: bool = False
