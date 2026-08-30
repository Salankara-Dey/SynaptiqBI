"""
Automation models — Phase 5.

Automations connect dataset and intelligence events to external webhooks
(primarily n8n workflows). Each trigger attempt is recorded as an
AutomationRun for auditability and debugging.
"""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    String, DateTime, ForeignKey, JSON, Enum, Boolean, Integer, Text, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AutomationEventType(str, enum.Enum):
    DATASET_UPLOADED = "dataset_uploaded"
    DATASET_READY = "dataset_ready"
    INSIGHT_GENERATED = "insight_generated"


class AutomationRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class Automation(Base):
    """
    Webhook-based automation triggered by platform events.
    Scoped to an organization for multi-tenant isolation.
    """
    __tablename__ = "automations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[AutomationEventType] = mapped_column(
        Enum(
            AutomationEventType,
            name="automation_event_type",
            values_callable=lambda cls: [m.value for m in cls],
        ),
        nullable=False,
        index=True,
    )
    webhook_url: Mapped[str] = mapped_column(String(2000), nullable=False)
    headers: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc), nullable=False,
    )

    runs = relationship("AutomationRun", back_populates="automation", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Automation id={self.id} name={self.name} event={self.event_type}>"


class AutomationRun(Base):
    """
    Immutable record of a single automation trigger attempt.
    Stores the request payload, HTTP response, and timing for debugging.
    """
    __tablename__ = "automation_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    automation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("automations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    status: Mapped[AutomationRunStatus] = mapped_column(
        Enum(
            AutomationRunStatus,
            name="automation_run_status",
            values_callable=lambda cls: [m.value for m in cls],
        ),
        default=AutomationRunStatus.PENDING,
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    trigger_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    response_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    http_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False,
    )

    automation = relationship("Automation", back_populates="runs")
