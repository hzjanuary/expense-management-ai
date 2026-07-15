from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import LlmProvider
from app.ai.schemas import SupportedIntent, TransactionParseRequest
from app.application.ai_parse import Clarification
from app.db.repositories import get_expense_total_for_category
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


def _format_vnd(amount_minor: int) -> str:
    return f"{amount_minor:,.0f}".replace(",", ".") + "₫"
