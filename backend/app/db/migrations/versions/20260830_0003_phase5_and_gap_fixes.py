"""Phase 5 automation tables + Phase 1-4 gap fixes.

Revision ID: 20260830_0003
Revises: 20260625_0002
Create Date: 2026-08-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260830_0003"
down_revision: str | None = "20260625_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


automation_event_type = postgresql.ENUM(
    "dataset_uploaded", "dataset_ready", "insight_generated",
    name="automation_event_type",
    create_type=False,
)

automation_run_status = postgresql.ENUM(
    "pending", "running", "success", "failed",
    name="automation_run_status",
    create_type=False,
)


def upgrade() -> None:
    # ── Gap fixes ─────────────────────────────────────────────────

    # Phase 2: Add description to datasets
    op.add_column("datasets", sa.Column("description", sa.Text(), nullable=True))

    # Phase 2: Add created_at to dataset_rows
    op.add_column(
        "dataset_rows",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # ── Phase 5: Automation tables ────────────────────────────────

    automation_event_type.create(op.get_bind(), checkfirst=True)
    automation_run_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "automations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("event_type", automation_event_type, nullable=False),
        sa.Column("webhook_url", sa.String(length=2000), nullable=False),
        sa.Column("headers", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_automations_organization_id", "automations", ["organization_id"], unique=False)
    op.create_index("ix_automations_created_by", "automations", ["created_by"], unique=False)
    op.create_index("ix_automations_event_type", "automations", ["event_type"], unique=False)

    op.create_table(
        "automation_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("automation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", automation_run_status, nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("trigger_payload", sa.JSON(), nullable=True),
        sa.Column("response_payload", sa.JSON(), nullable=True),
        sa.Column("http_status_code", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["automation_id"], ["automations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_automation_runs_automation_id", "automation_runs", ["automation_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_automation_runs_automation_id", table_name="automation_runs")
    op.drop_table("automation_runs")

    op.drop_index("ix_automations_event_type", table_name="automations")
    op.drop_index("ix_automations_created_by", table_name="automations")
    op.drop_index("ix_automations_organization_id", table_name="automations")
    op.drop_table("automations")

    automation_run_status.drop(op.get_bind(), checkfirst=True)
    automation_event_type.drop(op.get_bind(), checkfirst=True)

    op.drop_column("dataset_rows", "created_at")
    op.drop_column("datasets", "description")
