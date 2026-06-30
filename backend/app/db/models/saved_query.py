"""
SavedQuery model — Phase 3 completion.

Users can save analytical queries (aggregations, charts) to quickly
re-execute them later. Queries are scoped to a dataset and optionally
to an organization.
"""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, JSON, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QueryType(str, enum.Enum):
    AGGREGATE = "aggregate"
    CHART = "chart"


class SavedQuery(Base):
    __tablename__ = "saved_queries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    query_type: Mapped[QueryType] = mapped_column(
        Enum(
            QueryType,
            name="query_type",
            values_callable=lambda enum_class: [m.value for m in enum_class],
        ),
        nullable=False,
    )
    query_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc), nullable=False,
    )

    dataset = relationship("Dataset", back_populates="saved_queries")
    user = relationship("User", back_populates="saved_queries")
