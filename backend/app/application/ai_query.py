from dataclasses import dataclass
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import LlmProvider
from app.ai.schemas import SupportedIntent, TransactionParseRequest
from app.application.ai_parse import Clarification
from app.db.repositories import (
    get_budget_period,
    get_expense_breakdown_by_category,
    get_expense_total_for_category,
)
from app.domain.categories import CategoryValidationError, get_category_for_transaction
from app.domain.enums import TransactionType
from app.domain.money import MoneyValidationError, normalize_currency


class SpendingQueryValidationError(ValueError):
    """Raised when a spending query classification is unsupported or invalid."""


@dataclass(frozen=True, slots=True)
class QuerySpendingCommand:
    message: str
    locale: str = "vi-VN"
    currency: str = "VND"
    timezone: str = "Asia/Ho_Chi_Minh"


@dataclass(frozen=True, slots=True)
class DateRange:
    start: datetime
    end: datetime
    label: str


@dataclass(frozen=True, slots=True)
class QuerySpendingResult:
    intent: str
    category_slug: str | None
    currency: str
    date_range: DateRange | None
    amount_minor: int | None
    transaction_count: int
    answer: str | None
    needs_clarification: bool
    clarification: Clarification | None


@dataclass(frozen=True, slots=True)
class QueryBudgetRemainingCommand:
    message: str
    locale: str = "vi-VN"
    currency: str = "VND"
    timezone: str = "Asia/Ho_Chi_Minh"


@dataclass(frozen=True, slots=True)
class QueryBudgetRemainingResult:
    intent: str
    category_slug: str | None
    currency: str
    date_range: DateRange | None
    budget_minor: int | None
    spent_minor: int | None
    remaining_minor: int | None
    is_over_budget: bool | None
    transaction_count: int
    answer: str | None
    needs_clarification: bool
    clarification: Clarification | None


@dataclass(frozen=True, slots=True)
class QuerySpendingBreakdownCommand:
    message: str
    locale: str = "vi-VN"
    currency: str = "VND"
    timezone: str = "Asia/Ho_Chi_Minh"


@dataclass(frozen=True, slots=True)
class SpendingBreakdownEntry:
    category_slug: str
    amount_minor: int
    transaction_count: int
    percentage: float


@dataclass(frozen=True, slots=True)
class QuerySpendingBreakdownResult:
    intent: str
    currency: str
    date_range: DateRange | None
    total_expense_minor: int | None
    transaction_count: int
    top_category: SpendingBreakdownEntry | None
    breakdown: list[SpendingBreakdownEntry]
    answer: str | None
    needs_clarification: bool
    clarification: Clarification | None


async def answer_spending_query(
    session: AsyncSession,
    provider: LlmProvider,
    command: QuerySpendingCommand,
    *,
    now: datetime | None = None,
) -> QuerySpendingResult:
    currency = _normalize_query_currency(command.currency)
    request = TransactionParseRequest(
        message=command.message,
        locale=command.locale,
        default_currency=currency,
        timezone=command.timezone,
    )
    provider_result = await provider.parse_transaction_text(request)

    if provider_result.intent is not SupportedIntent.QUERY_SPENDING:
        return _clarification_result(
            intent=provider_result.intent.value,
            currency=currency,
            fields=["intent"],
            message=(
                "Mình chưa hiểu câu hỏi chi tiêu này. "
                "Bạn có thể hỏi theo danh mục và thời gian rõ hơn không?"
            ),
        )

    category_slug = provider_result.category_slug
    if category_slug is None or not category_slug.strip():
        return _clarification_result(
            intent=SupportedIntent.QUERY_SPENDING.value,
            currency=currency,
            fields=["category_slug"],
            message="Bạn muốn hỏi chi tiêu cho danh mục nào?",
        )

    try:
        category = get_category_for_transaction(
            category_slug,
            TransactionType.EXPENSE,
        )
    except CategoryValidationError:
        return _clarification_result(
            intent=SupportedIntent.QUERY_SPENDING.value,
            currency=currency,
            fields=["category_slug"],
            message="Bạn muốn hỏi chi tiêu cho danh mục nào?",
        )

    if provider_result.date_range_label != "this_month":
        return _clarification_result(
            intent=SupportedIntent.QUERY_SPENDING.value,
            currency=currency,
            fields=["date_range"],
            message="Bạn muốn xem chi tiêu trong khoảng thời gian nào?",
        )

    date_range = _this_month_range(command.timezone, now=now)
    amount_minor, transaction_count = await get_expense_total_for_category(
        session,
        category_slug=category.slug,
        currency=currency,
        range_start=date_range.start,
        range_end=date_range.end,
    )

    return QuerySpendingResult(
        intent=SupportedIntent.QUERY_SPENDING.value,
        category_slug=category.slug,
        currency=currency,
        date_range=date_range,
        amount_minor=amount_minor,
        transaction_count=transaction_count,
        answer=(
            f"Tháng này bạn đã chi {_format_vnd(amount_minor)} " f"cho {category.slug}."
        ),
        needs_clarification=False,
        clarification=None,
    )


async def answer_budget_remaining_query(
    session: AsyncSession,
    provider: LlmProvider,
    command: QueryBudgetRemainingCommand,
    *,
    now: datetime | None = None,
) -> QueryBudgetRemainingResult:
    currency = _normalize_query_currency(command.currency)
    request = TransactionParseRequest(
        message=command.message,
        locale=command.locale,
        default_currency=currency,
        timezone=command.timezone,
    )
    provider_result = await provider.parse_transaction_text(request)

    if provider_result.intent is not SupportedIntent.BUDGET_REMAINING:
        return _budget_clarification_result(
            intent=provider_result.intent.value,
            currency=currency,
            fields=["intent"],
            message=(
                "Mình chưa hiểu câu hỏi ngân sách này. "
                "Bạn có thể hỏi theo danh mục và thời gian rõ hơn không?"
            ),
        )

    category_slug = provider_result.category_slug
    if category_slug is None or not category_slug.strip():
        return _budget_clarification_result(
            intent=SupportedIntent.BUDGET_REMAINING.value,
            currency=currency,
            fields=["category_slug"],
            message="Bạn muốn hỏi ngân sách còn lại cho danh mục nào?",
        )

    try:
        category = get_category_for_transaction(
            category_slug,
            TransactionType.EXPENSE,
        )
    except CategoryValidationError:
        return _budget_clarification_result(
            intent=SupportedIntent.BUDGET_REMAINING.value,
            currency=currency,
            fields=["category_slug"],
            message="Bạn muốn hỏi ngân sách còn lại cho danh mục nào?",
        )

    if provider_result.date_range_label != "this_month":
        return _budget_clarification_result(
            intent=SupportedIntent.BUDGET_REMAINING.value,
            currency=currency,
            fields=["date_range"],
            message="Bạn muốn xem ngân sách còn lại trong khoảng thời gian nào?",
        )

    date_range = _this_month_range(command.timezone, now=now)
    spent_minor, transaction_count = await get_expense_total_for_category(
        session,
        category_slug=category.slug,
        currency=currency,
        range_start=date_range.start,
        range_end=date_range.end,
    )
    budget_period = await get_budget_period(
        session,
        year=date_range.start.year,
        month=date_range.start.month,
        currency=currency,
    )
    category_budget = None
    if budget_period is not None:
        category_budget = next(
            (
                budget
                for budget in budget_period.category_budgets
                if budget.category_slug == category.slug
            ),
            None,
        )

    if category_budget is None:
        return QueryBudgetRemainingResult(
            intent=SupportedIntent.BUDGET_REMAINING.value,
            category_slug=category.slug,
            currency=currency,
            date_range=date_range,
            budget_minor=None,
            spent_minor=spent_minor,
            remaining_minor=None,
            is_over_budget=None,
            transaction_count=transaction_count,
            answer=f"Bạn chưa thiết lập ngân sách cho {category.slug} tháng này.",
            needs_clarification=False,
            clarification=None,
        )

    budget_minor = category_budget.budget_minor
    remaining_minor = budget_minor - spent_minor
    return QueryBudgetRemainingResult(
        intent=SupportedIntent.BUDGET_REMAINING.value,
        category_slug=category.slug,
        currency=currency,
        date_range=date_range,
        budget_minor=budget_minor,
        spent_minor=spent_minor,
        remaining_minor=remaining_minor,
        is_over_budget=spent_minor > budget_minor,
        transaction_count=transaction_count,
        answer=f"Tháng này bạn còn {_format_vnd(remaining_minor)} cho {category.slug}.",
        needs_clarification=False,
        clarification=None,
    )


async def answer_spending_breakdown_query(
    session: AsyncSession,
    provider: LlmProvider,
    command: QuerySpendingBreakdownCommand,
    *,
    now: datetime | None = None,
) -> QuerySpendingBreakdownResult:
    currency = _normalize_query_currency(command.currency)
    request = TransactionParseRequest(
        message=command.message,
        locale=command.locale,
        default_currency=currency,
        timezone=command.timezone,
    )
    provider_result = await provider.parse_transaction_text(request)

    if provider_result.intent is not SupportedIntent.SPENDING_BREAKDOWN:
        return _breakdown_clarification_result(
            intent=provider_result.intent.value,
            currency=currency,
            fields=["intent"],
            message=(
                "Mình chưa hiểu câu hỏi phân tích chi tiêu này. "
                "Bạn có thể hỏi rõ khoảng thời gian hơn không?"
            ),
        )

    if provider_result.date_range_label != "this_week":
        return _breakdown_clarification_result(
            intent=SupportedIntent.SPENDING_BREAKDOWN.value,
            currency=currency,
            fields=["date_range"],
            message="Bạn muốn xem nhóm chi tiêu trong khoảng thời gian nào?",
        )

    date_range = _this_week_range(command.timezone, now=now)
    rows = await get_expense_breakdown_by_category(
        session,
        currency=currency,
        range_start=date_range.start,
        range_end=date_range.end,
    )
    rows.sort(key=lambda row: (-row[1], -row[2], row[0]))

    total_expense_minor = sum(amount_minor for _, amount_minor, _ in rows)
    transaction_count = sum(count for _, _, count in rows)
    if total_expense_minor == 0:
        return QuerySpendingBreakdownResult(
            intent=SupportedIntent.SPENDING_BREAKDOWN.value,
            currency=currency,
            date_range=date_range,
            total_expense_minor=0,
            transaction_count=0,
            top_category=None,
            breakdown=[],
            answer="Bạn chưa có khoản chi nào trong tuần này.",
            needs_clarification=False,
            clarification=None,
        )

    breakdown = [
        SpendingBreakdownEntry(
            category_slug=category_slug,
            amount_minor=amount_minor,
            transaction_count=count,
            percentage=round((amount_minor / total_expense_minor) * 100, 2),
        )
        for category_slug, amount_minor, count in rows
    ]
    top_category = breakdown[0]
    return QuerySpendingBreakdownResult(
        intent=SupportedIntent.SPENDING_BREAKDOWN.value,
        currency=currency,
        date_range=date_range,
        total_expense_minor=total_expense_minor,
        transaction_count=transaction_count,
        top_category=top_category,
        breakdown=breakdown,
        answer=(
            "Tuần này bạn chi nhiều nhất cho "
            f"{top_category.category_slug}: {_format_vnd(top_category.amount_minor)}."
        ),
        needs_clarification=False,
        clarification=None,
    )


def _normalize_query_currency(value: str) -> str:
    try:
        return normalize_currency(value)
    except MoneyValidationError as error:
        raise SpendingQueryValidationError(str(error)) from error


def _this_month_range(timezone: str, *, now: datetime | None) -> DateRange:
    try:
        zone = ZoneInfo(timezone)
    except ZoneInfoNotFoundError as error:
        raise SpendingQueryValidationError("timezone is invalid") from error

    current = now or datetime.now(zone)
    current = (
        current.astimezone(zone)
        if current.tzinfo is not None
        else current.replace(tzinfo=zone)
    )
    start = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)

    return DateRange(start=start, end=end, label="this_month")


def _this_week_range(timezone: str, *, now: datetime | None) -> DateRange:
    try:
        zone = ZoneInfo(timezone)
    except ZoneInfoNotFoundError as error:
        raise SpendingQueryValidationError("timezone is invalid") from error

    current = now or datetime.now(zone)
    current = (
        current.astimezone(zone)
        if current.tzinfo is not None
        else current.replace(tzinfo=zone)
    )
    week_start_date = current.date() - timedelta(days=current.weekday())
    start = datetime.combine(week_start_date, time.min, tzinfo=zone)
    end = start + timedelta(days=7)

    return DateRange(start=start, end=end, label="this_week")


def _clarification_result(
    *,
    intent: str,
    currency: str,
    fields: list[str],
    message: str,
) -> QuerySpendingResult:
    return QuerySpendingResult(
        intent=intent,
        category_slug=None,
        currency=currency,
        date_range=None,
        amount_minor=None,
        transaction_count=0,
        answer=None,
        needs_clarification=True,
        clarification=Clarification(message=message, fields=fields),
    )


def _budget_clarification_result(
    *,
    intent: str,
    currency: str,
    fields: list[str],
    message: str,
) -> QueryBudgetRemainingResult:
    return QueryBudgetRemainingResult(
        intent=intent,
        category_slug=None,
        currency=currency,
        date_range=None,
        budget_minor=None,
        spent_minor=None,
        remaining_minor=None,
        is_over_budget=None,
        transaction_count=0,
        answer=None,
        needs_clarification=True,
        clarification=Clarification(message=message, fields=fields),
    )


def _breakdown_clarification_result(
    *,
    intent: str,
    currency: str,
    fields: list[str],
    message: str,
) -> QuerySpendingBreakdownResult:
    return QuerySpendingBreakdownResult(
        intent=intent,
        currency=currency,
        date_range=None,
        total_expense_minor=None,
        transaction_count=0,
        top_category=None,
        breakdown=[],
        answer=None,
        needs_clarification=True,
        clarification=Clarification(message=message, fields=fields),
    )


def _format_vnd(amount_minor: int) -> str:
    return f"{amount_minor:,.0f}".replace(",", ".") + "₫"
