import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import LlmProvider
from app.ai.schemas import SpendingScope, SupportedIntent, TransactionParseRequest
from app.application.ai_parse import Clarification
from app.db.repositories import (
    get_budget_period,
    get_expense_breakdown_by_category,
    get_expense_total,
    get_expense_total_for_category,
)
from app.domain.categories import (
    CategoryValidationError,
    get_category_display_name,
    get_category_for_transaction,
    resolve_expense_category_slug,
)
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
    spending_scope: str | None
    category_slug: str | None
    currency: str
    date_range: DateRange | None
    amount_minor: int | None
    transaction_count: int
    answer: str | None
    needs_clarification: bool
    clarification: Clarification | None


@dataclass(frozen=True, slots=True)
class SpendingClassification:
    scope: SpendingScope
    category_slug: str | None
    date_range_label: str | None


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
    deterministic = _classify_deterministic_spending_query(command.message)
    if deterministic is None:
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

        spending_scope = _resolve_spending_scope(provider_result, command.message)
        date_range_label = _resolve_this_month_label(
            provider_result.date_range_label,
            command.message,
        )
        provider_category_slug = provider_result.category_slug
    else:
        spending_scope = deterministic.scope
        date_range_label = deterministic.date_range_label
        provider_category_slug = deterministic.category_slug

    if date_range_label != "this_month":
        return _clarification_result(
            intent=SupportedIntent.QUERY_SPENDING.value,
            currency=currency,
            fields=["date_range"],
            message="Bạn muốn xem chi tiêu trong khoảng thời gian nào?",
        )

    date_range = _this_month_range(command.timezone, now=now)
    if spending_scope is SpendingScope.TOTAL:
        amount_minor, transaction_count = await get_expense_total(
            session,
            currency=currency,
            range_start=date_range.start,
            range_end=date_range.end,
        )
        return QuerySpendingResult(
            intent=SupportedIntent.QUERY_SPENDING.value,
            spending_scope=SpendingScope.TOTAL.value,
            category_slug=None,
            currency=currency,
            date_range=date_range,
            amount_minor=amount_minor,
            transaction_count=transaction_count,
            answer=f"Tháng này bạn đã chi tổng cộng {_format_vnd(amount_minor)}.",
            needs_clarification=False,
            clarification=None,
        )

    category_slug = resolve_expense_category_slug(
        provider_category_slug,
        fallback_text=command.message,
    )
    if category_slug is None:
        return _clarification_result(
            intent=SupportedIntent.QUERY_SPENDING.value,
            currency=currency,
            fields=["category_slug"],
            message="Bạn muốn xem chi tiêu cho nhóm nào?",
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
            message="Bạn muốn xem chi tiêu cho nhóm nào?",
        )

    amount_minor, transaction_count = await get_expense_total_for_category(
        session,
        category_slug=category.slug,
        currency=currency,
        range_start=date_range.start,
        range_end=date_range.end,
    )

    return QuerySpendingResult(
        intent=SupportedIntent.QUERY_SPENDING.value,
        spending_scope=SpendingScope.CATEGORY.value,
        category_slug=category.slug,
        currency=currency,
        date_range=date_range,
        amount_minor=amount_minor,
        transaction_count=transaction_count,
        answer=(
            f"Tháng này bạn đã chi {_format_vnd(amount_minor)} "
            f"cho {get_category_display_name(category.slug)}."
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
            answer=(
                "Bạn chưa thiết lập ngân sách cho "
                f"{get_category_display_name(category.slug)} tháng này."
            ),
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
        answer=(
            f"Tháng này bạn còn {_format_vnd(remaining_minor)} "
            f"cho {get_category_display_name(category.slug)}."
        ),
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
            f"{get_category_display_name(top_category.category_slug)}: "
            f"{_format_vnd(top_category.amount_minor)}."
        ),
        needs_clarification=False,
        clarification=None,
    )


def _normalize_query_currency(value: str) -> str:
    try:
        return normalize_currency(value)
    except MoneyValidationError as error:
        raise SpendingQueryValidationError(str(error)) from error


def _resolve_spending_scope(
    provider_result: object,
    message: str,
) -> SpendingScope:
    raw_scope = getattr(provider_result, "spending_scope", None)
    if raw_scope is SpendingScope.TOTAL or raw_scope == SpendingScope.TOTAL.value:
        return SpendingScope.TOTAL
    if raw_scope is SpendingScope.CATEGORY or raw_scope == SpendingScope.CATEGORY.value:
        return SpendingScope.CATEGORY

    resolved_category = resolve_expense_category_slug(
        getattr(provider_result, "category_slug", None),
        fallback_text=message,
    )
    if resolved_category is not None:
        return SpendingScope.CATEGORY
    if _looks_like_total_spending_query(message):
        return SpendingScope.TOTAL
    return SpendingScope.CATEGORY


def _classify_deterministic_spending_query(
    message: str,
) -> SpendingClassification | None:
    if not _mentions_this_month(message):
        return None

    category_slug = (
        resolve_expense_category_slug(None, fallback_text=message)
        if _looks_like_fast_category_spending_query(message)
        else None
    )
    if category_slug is not None:
        return SpendingClassification(
            scope=SpendingScope.CATEGORY,
            category_slug=category_slug,
            date_range_label="this_month",
        )

    if _looks_like_fast_total_spending_query(message):
        return SpendingClassification(
            scope=SpendingScope.TOTAL,
            category_slug=None,
            date_range_label="this_month",
        )

    if _looks_like_category_spending_query(
        message
    ) and not _looks_like_total_spending_query(message):
        return SpendingClassification(
            scope=SpendingScope.CATEGORY,
            category_slug=None,
            date_range_label="this_month",
        )
    return None


def _resolve_this_month_label(date_range_label: str | None, message: str) -> str | None:
    if date_range_label is not None:
        return date_range_label
    if _mentions_this_month(message):
        return "this_month"
    return None


def _looks_like_total_spending_query(message: str) -> bool:
    normalized = _normalize_query_text(message)
    has_time = _mentions_this_month(message)
    has_spending = any(
        token in normalized
        for token in ("chi", "chi tieu", "tieu", "het bao nhieu", "het tien")
    ) or any(
        token in normalized
        for token in (
            "khoan chi",
            "cac khoan chi",
            "chi phi",
            "tien da chi",
            "tien da tieu",
            "tien di ra",
            "tien roi khoi vi",
            "vi da giam",
            "vi cua toi da giam",
        )
    )
    has_total = any(
        token in normalized
        for token in (
            "tong",
            "tong cong",
            "tat ca",
            "toan bo",
            "cong don",
            "bao nhieu tien da chi",
            "tieu bao nhieu",
            "da tieu bao nhieu",
            "tien da tieu",
            "tien da chi",
            "tien roi khoi vi",
            "vi da giam",
            "vi cua toi da giam",
            "cac khoan chi",
            "chi phi trong thang",
            "tong so tien di ra",
            "bao nhieu trong thang nay",
            "thang nay het bao nhieu tien",
        )
    )
    return has_time and has_spending and has_total


def _looks_like_fast_total_spending_query(message: str) -> bool:
    normalized = _normalize_query_text(message)
    has_time = _mentions_this_month(message)
    has_spending = any(
        token in normalized
        for token in ("chi", "chi tieu", "tieu", "het bao nhieu", "het tien")
    )
    has_total = any(
        token in normalized
        for token in (
            "tong",
            "tong cong",
            "tat ca",
            "bao nhieu trong thang nay",
            "thang nay het bao nhieu tien",
        )
    )
    return has_time and has_spending and has_total


def _looks_like_fast_category_spending_query(message: str) -> bool:
    normalized = _normalize_query_text(message)
    return _mentions_this_month(message) and any(
        token in normalized
        for token in (
            "an uong",
            "an ngoai",
            "food",
            "ca phe",
            "cafe",
            "coffee",
            "xang",
            "taxi",
            "transport",
            "thuoc",
        )
    )


def _looks_like_category_spending_query(message: str) -> bool:
    normalized = _normalize_query_text(message)
    has_time = _mentions_this_month(message)
    has_spending = any(
        token in normalized
        for token in ("chi", "chi tieu", "tieu", "het bao nhieu", "het tien")
    )
    has_category_hint = any(
        token in normalized for token in ("danh muc", "nhom", "loai")
    )
    return has_time and has_spending and has_category_hint


def _mentions_this_month(message: str) -> bool:
    normalized = _normalize_query_text(message)
    return any(
        token in normalized
        for token in (
            "thang nay",
            "thang hien tai",
            "trong thang hien tai",
            "dau thang den nay",
            "tu dau thang",
            "ke tu dau thang",
            "ngay dau tien cua thang nay",
            "this month",
            "current month",
        )
    )


def _normalize_query_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().casefold())
    without_marks = "".join(
        character for character in normalized if unicodedata.category(character) != "Mn"
    ).replace("đ", "d")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", without_marks)).strip()


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
        spending_scope=None,
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
