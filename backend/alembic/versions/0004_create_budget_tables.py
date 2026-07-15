"""create budget setup tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-15 00:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "budget_periods",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("total_budget_minor", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "year",
            "month",
            "currency",
            name="uq_budget_periods_year_month_currency",
        ),
    )
    op.create_table(
        "category_budgets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("budget_period_id", sa.String(length=36), nullable=False),
        sa.Column("category_slug", sa.String(length=80), nullable=False),
        sa.Column("budget_minor", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["budget_period_id"], ["budget_periods.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "budget_period_id",
            "category_slug",
            name="uq_category_budgets_period_category",
        ),
    )
    op.create_index(
        "ix_category_budgets_budget_period_id",
        "category_budgets",
        ["budget_period_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_category_budgets_budget_period_id",
        table_name="category_budgets",
    )
    op.drop_table("category_budgets")
    op.drop_table("budget_periods")
