from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BudgetPeriodModel
from app.db.repositories import (
    create_budget_period,
    get_budget_period,
    get_monthly_expense_total,
    get_monthly_expense_totals_by_category,
    replace_category_budgets,
)
from app.domain.categories import CategoryValidationError, get_category_for_transaction
from app.domain.enums import TransactionType
from app.domain.money import MoneyValidationError, normalize_currency


class BudgetValidationError(ValueError):
    """Raised when budget setup violates deterministic budget rules."""


class BudgetNotFoundError(LookupError):
    """Raised when a requested monthly budget setup does not exist."""


@dataclass(frozen=True, slots=True)
class CategoryBudgetCommand:
    category_slug: str
    budget_minor: int


@dataclass(frozen=True, slots=True)
class UpsertMonthlyBudgetCommand:
    year: int
    month: int
    currency: str
    total_budget_minor: int
    category_budgets: list[CategoryBudgetCommand]


@dataclass(frozen=True, slots=True)
class GetMonthlyBudgetQuery:
    year: int
    month: int
    currency: str


@dataclass(frozen=True, slots=True)
class CategoryBudgetResult:
    category_slug: str
    budget_minor: int


@dataclass(frozen=True, slots=True)
class MonthlyBudgetResult:
    year: int
    month: int
    currency: str
    total_budget_minor: int
    category_budgets: list[CategoryBudgetResult]


@dataclass(frozen=True, slots=True)
class GetBudgetRemainingQuery:
    year: int
    month: int
    currency: str


@dataclass(frozen=True, slots=True)
class CategoryBudgetRemainingResult:
    category_slug: str
    budget_minor: int
    spent_minor: int
    remaining_minor: int
    is_over_budget: bool


@dataclass(frozen=True, slots=True)
class BudgetRemainingResult:
    year: int
    month: int
    currency: str
    total_budget_minor: int
    total_expense_minor: int
    total_remaining_minor: int
    categories: list[CategoryBudgetRemainingResult]


async def upsert_monthly_budget(
    session: AsyncSession,
    command: UpsertMonthlyBudgetCommand,
) -> MonthlyBudgetResult:
    normalized = _validate_budget_command(command)

    async with session.begin():
        budget_period = await get_budget_period(
            session,
            year=normalized.year,
            month=normalized.month,
            currency=normalized.currency,
        )
        if budget_period is None:
            budget_period = await create_budget_period(
                session,
                year=normalized.year,
                month=normalized.month,
                currency=normalized.currency,
                total_budget_minor=normalized.total_budget_minor,
            )
        else:
            budget_period.total_budget_minor = normalized.total_budget_minor

        await replace_category_budgets(
            session,
            budget_period_id=budget_period.id,
            category_budgets=[
                (item.category_slug, item.budget_minor)
                for item in normalized.category_budgets
            ],
        )

    return _result_from_command(normalized)


async def get_monthly_budget(
    session: AsyncSession,
    query: GetMonthlyBudgetQuery,
) -> MonthlyBudgetResult:
    _validate_year_month(query.year, query.month)
    currency = _normalize_currency(query.currency)

    budget_period = await get_budget_period(
        session,
        year=query.year,
        month=query.month,
        currency=currency,
    )
    if budget_period is None:
        raise BudgetNotFoundError("monthly budget setup was not found")

    return _result_from_model(budget_period)


async def get_budget_remaining(
    session: AsyncSession,
    query: GetBudgetRemainingQuery,
) -> BudgetRemainingResult:
    _validate_year_month(query.year, query.month)
    currency = _normalize_currency(query.currency)

    budget_period = await get_budget_period(
        session,
        year=query.year,
        month=query.month,
        currency=currency,
    )
    if budget_period is None:
        raise BudgetNotFoundError("monthly budget setup was not found")

    month_start, month_end = _month_range(query.year, query.month)
    category_spending = await get_monthly_expense_totals_by_category(
        session,
        month_start=month_start,
        month_end=month_end,
    )
    total_expense_minor = await get_monthly_expense_total(
        session,
        month_start=month_start,
        month_end=month_end,
    )

    categories = [
        _remaining_category_result(
            category_slug=item.category_slug,
            budget_minor=item.budget_minor,
            spent_minor=category_spending.get(item.category_slug, 0),
        )
        for item in budget_period.category_budgets
    ]
    categories.sort(
        key=lambda item: (
            not item.is_over_budget,
            -item.spent_minor,
            item.category_slug,
        )
    )

    return BudgetRemainingResult(
        year=budget_period.year,
        month=budget_period.month,
        currency=budget_period.currency,
        total_budget_minor=budget_period.total_budget_minor,
        total_expense_minor=total_expense_minor,
        total_remaining_minor=budget_period.total_budget_minor - total_expense_minor,
        categories=categories,
    )


def _validate_budget_command(
    command: UpsertMonthlyBudgetCommand,
) -> UpsertMonthlyBudgetCommand:
    _validate_year_month(command.year, command.month)
    currency = _normalize_currency(command.currency)
    total_budget_minor = _validate_non_negative_minor_units(
        command.total_budget_minor,
        "total_budget_minor",
    )

    seen_categories: set[str] = set()
    normalized_category_budgets: list[CategoryBudgetCommand] = []
    for item in command.category_budgets:
        budget_minor = _validate_non_negative_minor_units(
            item.budget_minor,
            "category budget_minor",
        )
        try:
            category = get_category_for_transaction(
                item.category_slug,
                TransactionType.EXPENSE,
            )
        except CategoryValidationError as error:
            raise BudgetValidationError(str(error)) from error

        if category.slug in seen_categories:
            raise BudgetValidationError("duplicate category budget slug")
        seen_categories.add(category.slug)
        normalized_category_budgets.append(
            CategoryBudgetCommand(
                category_slug=category.slug,
                budget_minor=budget_minor,
            )
        )

    category_budget_total = sum(
        item.budget_minor for item in normalized_category_budgets
    )
    if category_budget_total > total_budget_minor:
        raise BudgetValidationError("category budget total cannot exceed total budget")

    return UpsertMonthlyBudgetCommand(
        year=command.year,
        month=command.month,
        currency=currency,
        total_budget_minor=total_budget_minor,
        category_budgets=normalized_category_budgets,
    )


def _validate_year_month(year: int, month: int) -> None:
    if year < 1900 or year > 9999:
        raise BudgetValidationError("year must be between 1900 and 9999")
    if month < 1 or month > 12:
        raise BudgetValidationError("month must be between 1 and 12")


def _normalize_currency(currency: str) -> str:
    try:
        return normalize_currency(currency)
    except MoneyValidationError as error:
        raise BudgetValidationError(str(error)) from error


def _validate_non_negative_minor_units(value: int, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise BudgetValidationError(f"{field_name} must be an integer")
    if value < 0:
        raise BudgetValidationError(f"{field_name} must be zero or positive")
    return value


def _month_range(year: int, month: int) -> tuple[datetime, datetime]:
    next_year = year + 1 if month == 12 else year
    next_month = 1 if month == 12 else month + 1
    return (
        datetime(year, month, 1, tzinfo=UTC),
        datetime(next_year, next_month, 1, tzinfo=UTC),
    )


def _remaining_category_result(
    *,
    category_slug: str,
    budget_minor: int,
    spent_minor: int,
) -> CategoryBudgetRemainingResult:
    return CategoryBudgetRemainingResult(
        category_slug=category_slug,
        budget_minor=budget_minor,
        spent_minor=spent_minor,
        remaining_minor=budget_minor - spent_minor,
        is_over_budget=spent_minor > budget_minor,
    )


def _result_from_command(command: UpsertMonthlyBudgetCommand) -> MonthlyBudgetResult:
    return MonthlyBudgetResult(
        year=command.year,
        month=command.month,
        currency=command.currency,
        total_budget_minor=command.total_budget_minor,
        category_budgets=[
            CategoryBudgetResult(
                category_slug=item.category_slug,
                budget_minor=item.budget_minor,
            )
            for item in command.category_budgets
        ],
    )


def _result_from_model(budget_period: BudgetPeriodModel) -> MonthlyBudgetResult:
    category_budgets = sorted(
        budget_period.category_budgets,
        key=lambda item: item.category_slug,
    )
    return MonthlyBudgetResult(
        year=budget_period.year,
        month=budget_period.month,
        currency=budget_period.currency,
        total_budget_minor=budget_period.total_budget_minor,
        category_budgets=[
            CategoryBudgetResult(
                category_slug=item.category_slug,
                budget_minor=item.budget_minor,
            )
            for item in category_budgets
        ],
    )
