from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.money import MoneyValidationError, normalize_currency


class AiParseRequest(BaseModel):
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


class AiTransactionDraftResponse(BaseModel):
    type: str
    amount_minor: int
    currency: str
    category_slug: str
    description: str
    merchant: str | None
    occurred_at: datetime | None
    source: str


class AiClarificationResponse(BaseModel):
    message: str
    fields: list[str]


class AiParseResponse(BaseModel):
    intent: str
    draft_id: str | None
    draft: AiTransactionDraftResponse | None
    needs_confirmation: bool
    confidence: str
    missing_fields: list[str]
    clarification: AiClarificationResponse | None = None


class AiConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: str = Field(min_length=1)


class AiConfirmedTransactionResponse(BaseModel):
    id: str
    type: str
    amount_minor: int
    currency: str
    category_slug: str
    description: str
    merchant: str | None
    occurred_at: datetime
    source: str


class AiConfirmResponse(BaseModel):
    transaction: AiConfirmedTransactionResponse
    account_balance_minor: int


class AiCancelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: str = Field(min_length=1)


class AiCancelResponse(BaseModel):
    draft_id: str
    status: str
    cancelled: bool


class AiQuerySpendingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1)
    locale: str = "vi-VN"
    currency: str = "VND"
    timezone: str = "Asia/Ho_Chi_Minh"

    @field_validator("message")
    @classmethod
    def validate_query_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("message is required")
        return stripped

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        try:
            return normalize_currency(value)
        except MoneyValidationError as error:
            raise ValueError(str(error)) from error


class AiQueryDateRangeResponse(BaseModel):
    start: datetime
    end: datetime
    label: str


class AiQuerySpendingResponse(BaseModel):
    intent: str
    spending_scope: str | None
    category_slug: str | None
    currency: str
    date_range: AiQueryDateRangeResponse | None
    amount_minor: int | None
    transaction_count: int
    answer: str | None
    needs_clarification: bool = False
    clarification: AiClarificationResponse | None = None


class AiQueryBudgetRemainingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1)
    locale: str = "vi-VN"
    currency: str = "VND"
    timezone: str = "Asia/Ho_Chi_Minh"

    @field_validator("message")
    @classmethod
    def validate_query_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("message is required")
        return stripped

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        try:
            return normalize_currency(value)
        except MoneyValidationError as error:
            raise ValueError(str(error)) from error


class AiQueryBudgetRemainingResponse(BaseModel):
    intent: str
    category_slug: str | None
    currency: str
    date_range: AiQueryDateRangeResponse | None
    budget_minor: int | None
    spent_minor: int | None
    remaining_minor: int | None
    is_over_budget: bool | None
    transaction_count: int
    answer: str | None
    needs_clarification: bool = False
    clarification: AiClarificationResponse | None = None


class AiQuerySpendingBreakdownRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1)
    locale: str = "vi-VN"
    currency: str = "VND"
    timezone: str = "Asia/Ho_Chi_Minh"

    @field_validator("message")
    @classmethod
    def validate_query_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("message is required")
        return stripped

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        try:
            return normalize_currency(value)
        except MoneyValidationError as error:
            raise ValueError(str(error)) from error


class AiSpendingBreakdownEntryResponse(BaseModel):
    category_slug: str
    amount_minor: int
    transaction_count: int
    percentage: float


class AiQuerySpendingBreakdownResponse(BaseModel):
    intent: str
    currency: str
    date_range: AiQueryDateRangeResponse | None
    total_expense_minor: int | None
    transaction_count: int
    top_category: AiSpendingBreakdownEntryResponse | None
    breakdown: list[AiSpendingBreakdownEntryResponse]
    answer: str | None
    needs_clarification: bool = False
    clarification: AiClarificationResponse | None = None


class AiClearHistoryResponse(BaseModel):
    deleted_draft_count: int
    preserved_transaction_count: int
    cleared: bool
