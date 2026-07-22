from dataclasses import dataclass
from typing import Literal

from pydantic import ValidationError

from app.ai.errors import (
    LlmProviderInvalidResponseError,
    LlmProviderTimeoutError,
    LlmProviderUnavailableError,
)
from app.ai.schemas import (
    Confidence,
    LlmProviderStatus,
    SpendingScope,
    SupportedIntent,
    TransactionParseRequest,
    TransactionParseResult,
)

FakeProviderMode = Literal["normal", "unavailable", "timeout", "invalid_response"]


@dataclass(frozen=True, slots=True)
class FakeLlmProvider:
    mode: FakeProviderMode = "normal"
    provider_name: str = "fake"
    model_name: str = "fake-structured-parser"

    async def parse_transaction_text(
        self,
        request: TransactionParseRequest,
    ) -> TransactionParseResult:
        if self.mode == "unavailable":
            raise LlmProviderUnavailableError()
        if self.mode == "timeout":
            raise LlmProviderTimeoutError()
        if self.mode == "invalid_response":
            return self._invalid_response()

        if _is_lunch_expense_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.CREATE_TRANSACTION,
                transaction_type="expense",
                amount_minor=35_000,
                currency=request.default_currency,
                category_slug="food",
                description="ăn trưa",
                merchant=None,
                occurred_at_text="hôm nay",
                occurred_at_iso=None,
                needs_confirmation=False,
                confidence=Confidence.HIGH,
            )

        if _is_missing_amount_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.CREATE_TRANSACTION,
                transaction_type="expense",
                amount_minor=None,
                currency=request.default_currency,
                category_slug="food",
                description="ăn trưa",
                merchant=None,
                occurred_at_text="hôm nay",
                occurred_at_iso=None,
                needs_confirmation=True,
                confidence=Confidence.LOW,
                missing_fields=["amount_minor"],
            )

        if _is_missing_category_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.CREATE_TRANSACTION,
                transaction_type="expense",
                amount_minor=35_000,
                currency=request.default_currency,
                category_slug=None,
                description="chi tiêu",
                merchant=None,
                occurred_at_text="hôm nay",
                occurred_at_iso=None,
                needs_confirmation=True,
                confidence=Confidence.LOW,
                missing_fields=["category_slug"],
            )

        if _is_spending_breakdown_query_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.SPENDING_BREAKDOWN,
                transaction_type=None,
                amount_minor=None,
                currency=request.default_currency,
                category_slug=None,
                description=None,
                merchant=None,
                occurred_at_text=None,
                occurred_at_iso=None,
                date_range_label="this_week",
                needs_confirmation=False,
                confidence=Confidence.HIGH,
                missing_fields=[],
            )

        if _is_missing_spending_breakdown_date_range_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.SPENDING_BREAKDOWN,
                currency=request.default_currency,
                date_range_label=None,
                needs_confirmation=True,
                confidence=Confidence.LOW,
                missing_fields=["date_range"],
            )

        if _is_food_budget_remaining_query_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.BUDGET_REMAINING,
                transaction_type=None,
                amount_minor=None,
                currency=request.default_currency,
                category_slug="food",
                description=None,
                merchant=None,
                occurred_at_text=None,
                occurred_at_iso=None,
                date_range_label="this_month",
                needs_confirmation=False,
                confidence=Confidence.HIGH,
                missing_fields=[],
            )

        if _is_missing_budget_remaining_category_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.BUDGET_REMAINING,
                currency=request.default_currency,
                date_range_label="this_month",
                needs_confirmation=True,
                confidence=Confidence.LOW,
                missing_fields=["category_slug"],
            )

        if _is_total_spending_query_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.QUERY_SPENDING,
                transaction_type=None,
                amount_minor=None,
                currency=request.default_currency,
                category_slug=None,
                description=None,
                merchant=None,
                occurred_at_text=None,
                occurred_at_iso=None,
                date_range_label="this_month",
                spending_scope=SpendingScope.TOTAL,
                needs_confirmation=False,
                confidence=Confidence.HIGH,
                missing_fields=[],
            )

        if _is_category_spending_query_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.QUERY_SPENDING,
                transaction_type=None,
                amount_minor=None,
                currency=request.default_currency,
                category_slug=_sample_category_slug(request.message),
                description=None,
                merchant=None,
                occurred_at_text=None,
                occurred_at_iso=None,
                date_range_label="this_month",
                spending_scope=SpendingScope.CATEGORY,
                needs_confirmation=False,
                confidence=Confidence.HIGH,
                missing_fields=[],
            )

        if _is_missing_query_category_sample(request.message):
            return TransactionParseResult(
                intent=SupportedIntent.QUERY_SPENDING,
                currency=request.default_currency,
                date_range_label="this_month",
                spending_scope=SpendingScope.CATEGORY,
                needs_confirmation=True,
                confidence=Confidence.LOW,
                missing_fields=["category_slug"],
            )

        return TransactionParseResult(
            intent=SupportedIntent.UNKNOWN,
            needs_confirmation=True,
            confidence=Confidence.LOW,
            missing_fields=["intent"],
        )

    async def get_status(self) -> LlmProviderStatus:
        if self.mode == "unavailable":
            return LlmProviderStatus(
                provider_name=self.provider_name,
                model_name=self.model_name,
                available=False,
                reason="fake provider unavailable",
            )
        return LlmProviderStatus(
            provider_name=self.provider_name,
            model_name=self.model_name,
            available=True,
            reason=None,
        )

    def _invalid_response(self) -> TransactionParseResult:
        try:
            return TransactionParseResult.model_validate(
                {
                    "intent": SupportedIntent.CREATE_TRANSACTION,
                    "amount_minor": 35.5,
                    "needs_confirmation": False,
                    "confidence": Confidence.HIGH,
                }
            )
        except ValidationError as error:
            raise LlmProviderInvalidResponseError() from error


def _is_lunch_expense_sample(message: str) -> bool:
    normalized = message.casefold()
    return "tiêu" in normalized and "35k" in normalized and "ăn trưa" in normalized


def _is_missing_amount_sample(message: str) -> bool:
    normalized = message.casefold()
    return (
        "ăn trưa" in normalized and "35k" not in normalized and "tiêu" not in normalized
    )


def _is_missing_category_sample(message: str) -> bool:
    normalized = message.casefold()
    return "tiêu" in normalized and "35k" in normalized and "ăn trưa" not in normalized


def _is_total_spending_query_sample(message: str) -> bool:
    normalized = message.casefold()
    return (
        "tháng này" in normalized
        and "bao nhiêu" in normalized
        and (
            "tổng" in normalized
            or "tổng cộng" in normalized
            or "trong tháng này" in normalized
            or "hết bao nhiêu tiền" in normalized
        )
    )


def _is_category_spending_query_sample(message: str) -> bool:
    normalized = message.casefold()
    return (
        "tháng này" in normalized
        and "bao nhiêu" in normalized
        and (
            "ăn uống" in normalized
            or "ăn ngoài" in normalized
            or "food" in normalized
            or "cà phê" in normalized
            or "cafe" in normalized
            or "coffee" in normalized
            or "xăng" in normalized
            or "taxi" in normalized
            or "transport" in normalized
            or "thuốc" in normalized
        )
    )


def _sample_category_slug(message: str) -> str:
    normalized = message.casefold()
    if "cà phê" in normalized or "cafe" in normalized or "coffee" in normalized:
        return "coffee"
    if "xăng" in normalized or "taxi" in normalized or "transport" in normalized:
        return "transport"
    if "thuốc" in normalized:
        return "health"
    return "food"


def _is_missing_query_category_sample(message: str) -> bool:
    normalized = message.casefold()
    return "tháng này" in normalized and "bao nhiêu" in normalized


def _is_spending_breakdown_query_sample(message: str) -> bool:
    normalized = message.casefold()
    return "tuần này" in normalized and (
        "tiêu nhiều nhất" in normalized
        or "chi nhiều nhất" in normalized
        or "top chi tiêu" in normalized
    )


def _is_missing_spending_breakdown_date_range_sample(message: str) -> bool:
    normalized = message.casefold()
    return "tuần này" not in normalized and (
        "tiêu nhiều nhất" in normalized
        or "chi nhiều nhất" in normalized
        or "top chi tiêu" in normalized
    )


def _is_food_budget_remaining_query_sample(message: str) -> bool:
    normalized = message.casefold()
    return (
        "tháng này" in normalized
        and "bao nhiêu" in normalized
        and ("còn" in normalized or "ngân sách" in normalized or "budget" in normalized)
        and (
            "tiền ăn" in normalized
            or "ăn uống" in normalized
            or "ăn ngoài" in normalized
            or "food" in normalized
        )
    )


def _is_missing_budget_remaining_category_sample(message: str) -> bool:
    normalized = message.casefold()
    return (
        "tháng này" in normalized
        and "bao nhiêu" in normalized
        and ("còn" in normalized or "ngân sách" in normalized or "budget" in normalized)
    )
