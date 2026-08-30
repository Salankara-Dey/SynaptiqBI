"""Phase 6 — Power BI reports table.

Revision ID: 20260830_0004
Revises: 20260830_0003
Create Date: 2026-08-30
"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260830_0004"
down_revision: str | None = "20260830_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "powerbi_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("workspace_id", sa.String(length=255), nullable=False),
        sa.Column("report_id", sa.String(length=255), nullable=False),
        sa.Column("dataset_id", sa.String(length=255), nullable=True),
        sa.Column("embed_url", sa.String(length=2000), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_powerbi_reports_organization_id", "powerbi_reports", ["organization_id"], unique=False)
    op.create_index("ix_powerbi_reports_created_by", "powerbi_reports", ["created_by"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_powerbi_reports_created_by", table_name="powerbi_reports")
    op.drop_index("ix_powerbi_reports_organization_id", table_name="powerbi_reports")
    op.drop_table("powerbi_reports")
