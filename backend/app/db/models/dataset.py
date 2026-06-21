import uuid
from datetime import datetime
from sqlalchemy import String, Integer, BigInteger, DateTime, ForeignKey, JSON, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class DatasetStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    READY   = "ready"
    FAILED  = "failed"


class Dataset(Base):
    """
    Immutable raw upload record. One row per user upload.
    ETL produces a separate clean_* snapshot — raw data is never mutated.
    """
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)

    raw_row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_col_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_columns: Mapped[list | None] = mapped_column(JSON, nullable=True)

    status: Mapped[DatasetStatus] = mapped_column(
        Enum(
            DatasetStatus,
            name="dataset_status",
            values_callable=lambda enum_class: [member.value for member in enum_class],
        ),
        default=DatasetStatus.PENDING,
        nullable=False,
        index=True,
    )
    clean_row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    column_types: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    profile: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    etl_error: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)

    owner = relationship("User", back_populates="datasets")
    rows = relationship("DatasetRow", back_populates="dataset", cascade="all, delete-orphan")


class DatasetRow(Base):
    """
    Cleaned, type-coerced rows stored as JSON.
    Schema-flexible storage avoids dynamic table creation per dataset.
    Trade-off: no column-level indexing — acceptable until Phase 3 analytics.
    """
    __tablename__ = "dataset_rows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)

    dataset = relationship("Dataset", back_populates="rows")
