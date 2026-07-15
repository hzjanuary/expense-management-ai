"""create ai transaction drafts

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-15 00:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_transaction_drafts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("intent", sa.String(length=40), nullable=False),
        sa.Column("transaction_type", sa.String(length=20), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("category_slug", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("merchant", sa.String(length=200), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("occurred_at_text", sa.String(length=120), nullable=True),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("confidence", sa.String(length=20), nullable=False),
        sa.Column("needs_confirmation", sa.Boolean(), nullable=False),
        sa.Column("missing_fields_json", sa.Text(), nullable=False),
        sa.Column("raw_user_text", sa.String(length=1000), nullable=False),
        sa.Column("provider_name", sa.String(length=80), nullable=False),
        sa.Column("model_name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_transaction_id", sa.String(length=36), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_transaction_id"], ["transactions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_transaction_drafts_status",
        "ai_transaction_drafts",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ai_transaction_drafts_status",
        table_name="ai_transaction_drafts",
    )
    op.drop_table("ai_transaction_drafts")
