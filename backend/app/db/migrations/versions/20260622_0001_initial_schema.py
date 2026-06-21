"""Create identity and dataset tables.

Revision ID: 20260622_0001
Revises:
Create Date: 2026-06-22
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260622_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


dataset_status = postgresql.ENUM(
    "pending",
    "running",
    "ready",
    "failed",
    name="dataset_status",
    create_type=False,
)


def upgrade() -> None:
    dataset_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "datasets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("file_path", sa.String(length=1000), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("raw_row_count", sa.Integer(), nullable=True),
        sa.Column("raw_col_count", sa.Integer(), nullable=True),
        sa.Column("raw_columns", sa.JSON(), nullable=True),
        sa.Column("status", dataset_status, nullable=False),
        sa.Column("clean_row_count", sa.Integer(), nullable=True),
        sa.Column("column_types", sa.JSON(), nullable=True),
        sa.Column("profile", sa.JSON(), nullable=True),
        sa.Column("etl_error", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_datasets_owner_id", "datasets", ["owner_id"], unique=False)
    op.create_index("ix_datasets_status", "datasets", ["status"], unique=False)

    op.create_table(
        "dataset_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("row_index", sa.Integer(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dataset_rows_dataset_id", "dataset_rows", ["dataset_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_dataset_rows_dataset_id", table_name="dataset_rows")
    op.drop_table("dataset_rows")
    op.drop_index("ix_datasets_status", table_name="datasets")
    op.drop_index("ix_datasets_owner_id", table_name="datasets")
    op.drop_table("datasets")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    dataset_status.drop(op.get_bind(), checkfirst=True)
