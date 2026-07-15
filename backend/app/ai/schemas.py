from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.money import MoneyValidationError, normalize_currency


class SupportedIntent(StrEnum):
    CREATE_TRANSACTION = "create_transaction"
    QUERY_SPENDING = "query_spending"
    SET_BUDGET = "set_budget"
    UNKNOWN = "unknown"


class Confidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TransactionParseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1)
    locale: str = "vi-VN"
    default_currency: str = "VND"
    timezone: str = "Asia/Ho_Chi_Minh"

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("message is required")
        return stripped

    @field_validator("default_currency")
    @classmethod
    def validate_default_currency(cls, value: str) -> str:
        try:
            return normalize_currency(value)
        except MoneyValidationError as error:
            raise ValueError(str(error)) from error


class TransactionParseResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intent: SupportedIntent
    transaction_type: str | None = None
    amount_minor: int | None = Field(default=None, strict=True, gt=0)
    currency: str | None = None
    category_slug: str | None = None
    description: str | None = None
    merchant: str | None = None
    occurred_at_text: str | None = None
    occurred_at_iso: str | None = None
    date_range_label: str | None = None
    needs_confirmation: bool
    confidence: Confidence
    missing_fields: list[str] = Field(default_factory=list)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            return normalize_currency(value)
        except MoneyValidationError as error:
            raise ValueError(str(error)) from error


class LlmProviderStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider_name: str
    model_name: str
    available: bool
    reason: str | None = None
