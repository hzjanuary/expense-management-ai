import re
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.repositories import (
    get_monthly_category_breakdown,
    get_monthly_transaction_type_totals,
    get_total_account_balance_minor,
)
from app.domain.enums import TransactionType


class DashboardValidationError(ValueError):
    """Raised when a dashboard query violates deterministic query rules."""


_MONTH_PATTERN = re.compile(r"^(?P<year>\d{4})-(?P<month>\d{2})$")


@dataclass(frozen=True, slots=True)
class DashboardSummaryQuery:
    month: str


@dataclass(frozen=True, slots=True)
class DashboardCategoryBreakdown:
    category_slug: str
    type: str
    amount_minor: int


@dataclass(frozen=True, slots=True)
class DashboardSummaryResult:
    currency: str
    total_balance_minor: int
    monthly_income_minor: int
    monthly_expense_minor: int
    category_breakdown: list[DashboardCategoryBreakdown]


async def get_dashboard_summary(
    session: AsyncSession,
    query: DashboardSummaryQuery,
) -> DashboardSummaryResult:
    month_start, month_end = _parse_month_range(query.month)

    total_balance_minor = await get_total_account_balance_minor(session)
    type_totals = await get_monthly_transaction_type_totals(
        session,
        month_start=month_start,
        month_end=month_end,
    )
    category_totals = await get_monthly_category_breakdown(
        session,
        month_start=month_start,
        month_end=month_end,
    )

    breakdown = [
        DashboardCategoryBreakdown(
            category_slug=category_slug,
            type=transaction_type,
            amount_minor=amount_minor,
        )
        for category_slug, transaction_type, amount_minor in category_totals
    ]
    breakdown.sort(
        key=lambda item: (
            item.type,
            -item.amount_minor,
            item.category_slug,
        )
    )

    return DashboardSummaryResult(
        currency=get_settings().default_currency,
        total_balance_minor=total_balance_minor,
        monthly_income_minor=type_totals.get(TransactionType.INCOME.value, 0),
        monthly_expense_minor=type_totals.get(TransactionType.EXPENSE.value, 0),
        category_breakdown=breakdown,
    )


def _parse_month_range(value: str) -> tuple[datetime, datetime]:
    match = _MONTH_PATTERN.match(value)
    if match is None:
        raise DashboardValidationError("month must use YYYY-MM format")

    year = int(match.group("year"))
    month = int(match.group("month"))
    if month < 1 or month > 12:
        raise DashboardValidationError("month must use YYYY-MM format")

    next_year = year + 1 if month == 12 else year
    next_month = 1 if month == 12 else month + 1
    return (
        datetime(year, month, 1, tzinfo=UTC),
        datetime(next_year, next_month, 1, tzinfo=UTC),
    )
