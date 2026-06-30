"""Add organizations, memberships, refresh_tokens, saved_queries tables and dataset.organization_id.

Revision ID: 20260625_0002
Revises: 20260622_0001
Create Date: 2026-06-25
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260625_0002"
down_revision: str | None = "20260622_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


member_role = postgresql.ENUM(
    "owner", "admin", "member", "viewer",
    name="member_role",
    create_type=False,
)

query_type = postgresql.ENUM(
    "aggregate", "chart",
    name="query_type",
    create_type=False,
)


def upgrade() -> None:
    # Create enums
    member_role.create(op.get_bind(), checkfirst=True)
    query_type.create(op.get_bind(), checkfirst=True)

    # Organizations
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)

    # Memberships
    op.create_table(
        "memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", member_role, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "organization_id", name="uq_user_org"),
    )
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"], unique=False)
    op.create_index("ix_memberships_organization_id", "memberships", ["organization_id"], unique=False)

    # Refresh tokens
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    # Saved queries
    op.create_table(
        "saved_queries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("query_type", query_type, nullable=False),
        sa.Column("query_config", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_saved_queries_dataset_id", "saved_queries", ["dataset_id"], unique=False)
    op.create_index("ix_saved_queries_user_id", "saved_queries", ["user_id"], unique=False)
    op.create_index("ix_saved_queries_organization_id", "saved_queries", ["organization_id"], unique=False)

    # Add organization_id to datasets
    op.add_column("datasets", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_datasets_organization_id", "datasets", "organizations",
        ["organization_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_datasets_organization_id", "datasets", ["organization_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_datasets_organization_id", table_name="datasets")
    op.drop_constraint("fk_datasets_organization_id", "datasets", type_="foreignkey")
    op.drop_column("datasets", "organization_id")

    op.drop_index("ix_saved_queries_organization_id", table_name="saved_queries")
    op.drop_index("ix_saved_queries_user_id", table_name="saved_queries")
    op.drop_index("ix_saved_queries_dataset_id", table_name="saved_queries")
    op.drop_table("saved_queries")

    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_memberships_organization_id", table_name="memberships")
    op.drop_index("ix_memberships_user_id", table_name="memberships")
    op.drop_table("memberships")

    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_table("organizations")

    query_type.drop(op.get_bind(), checkfirst=True)
    member_role.drop(op.get_bind(), checkfirst=True)
