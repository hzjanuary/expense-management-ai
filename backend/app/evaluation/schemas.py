from __future__ import annotations

from enum import StrEnum
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SCHEMA_VERSION = "vi-finance-benchmark-v1"


class BenchmarkIntent(StrEnum):
    CREATE_TRANSACTION = "create_transaction"
    QUERY_SPENDING = "query_spending"
    BUDGET_REMAINING = "budget_remaining"
    SPENDING_BREAKDOWN = "spending_breakdown"
    UNKNOWN = "unknown"


class TransactionType(StrEnum):
    EXPENSE = "expense"
    INCOME = "income"


class Currency(StrEnum):
    VND = "VND"


class DateLabel(StrEnum):
    TODAY = "today"
    YESTERDAY = "yesterday"


class DateRangeLabel(StrEnum):
    THIS_WEEK = "this_week"
    THIS_MONTH = "this_month"


class ClarificationReason(StrEnum):
    MISSING_AMOUNT = "missing_amount"
    MISSING_CATEGORY = "missing_category"
    AMBIGUOUS_AMOUNT = "ambiguous_amount"
    UNSUPPORTED_PERIOD = "unsupported_period"
    AMBIGUOUS_INTENT = "ambiguous_intent"


class DatasetSplit(StrEnum):
    TRAIN = "train"
    DEV = "dev"
    TEST = "test"


class DatasetSource(StrEnum):
    SYNTHETIC = "synthetic"
    REVIEWED_TEMPLATE = "reviewed_template"


EXPENSE_CATEGORIES: frozenset[str] = frozenset(
    {
        "food",
        "coffee",
        "transport",
        "shopping",
        "bills",
        "rent",
        "health",
        "education",
        "entertainment",
        "other",
    }
)
INCOME_CATEGORIES: frozenset[str] = frozenset(
    {"salary", "bonus", "gift", "other_income"}
)
CANONICAL_CATEGORIES: frozenset[str] = EXPENSE_CATEGORIES | INCOME_CATEGORIES

CONTROLLED_TAGS: frozenset[str] = frozenset(
    {
        "clear",
        "colloquial",
        "no_diacritics",
        "typo",
        "mixed_language",
        "expense",
        "income",
        "total_query",
        "category_query",
        "budget_query",
        "breakdown_query",
        "ambiguous_amount",
        "quantity_ambiguity",
        "time_ambiguity",
        "hypothetical",
        "price_question",
        "unsupported",
        "adversarial",
        "clarification_required",
    }
)

ANALYTICAL_INTENTS: frozenset[BenchmarkIntent] = frozenset(
    {
        BenchmarkIntent.QUERY_SPENDING,
        BenchmarkIntent.BUDGET_REMAINING,
        BenchmarkIntent.SPENDING_BREAKDOWN,
    }
)


class BenchmarkRecord(BaseModel):
    """One independently reviewed Vietnamese financial-language benchmark sample."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(min_length=1, pattern=r"^[a-z0-9][a-z0-9-]*$")
    text: str = Field(min_length=1)
    locale: str = "vi-VN"
    intent: BenchmarkIntent
    transaction_type: TransactionType | None
    amount_minor: int | None = Field(default=None, strict=True)
    currency: Currency | None
    category_slug: str | None
    description: str | None
    date_label: DateLabel | None
    date_range_label: DateRangeLabel | None
    should_create_draft: bool
    needs_clarification: bool
    clarification_reason: ClarificationReason | None
    tags: list[str] = Field(min_length=1)
    split: DatasetSplit
    source: DatasetSource
    notes: str | None = None

    transaction_required_fields: ClassVar[tuple[str, ...]] = (
        "transaction_type",
        "amount_minor",
        "currency",
        "category_slug",
        "description",
    )

    @field_validator("text")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("text is required")
        return stripped

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, value: str) -> str:
        if value != "vi-VN":
            raise ValueError("locale must be vi-VN")
        return value

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: list[str]) -> list[str]:
        unique_tags = []
        seen: set[str] = set()
        for tag in value:
            if tag not in CONTROLLED_TAGS:
                raise ValueError(f"unsupported tag: {tag}")
            if tag in seen:
                raise ValueError(f"duplicate tag: {tag}")
            seen.add(tag)
            unique_tags.append(tag)
        return unique_tags

    @field_validator("category_slug")
    @classmethod
    def validate_category_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if stripped not in CANONICAL_CATEGORIES:
            raise ValueError(f"unsupported category_slug: {stripped}")
        return stripped

    @model_validator(mode="after")
    def validate_contract_consistency(self) -> BenchmarkRecord:
        if self.should_create_draft and self.needs_clarification:
            raise ValueError("draft samples cannot also require clarification")

        if self.needs_clarification and self.clarification_reason is None:
            raise ValueError(
                "clarification_reason is required when clarification is needed"
            )
        if not self.needs_clarification and self.clarification_reason is not None:
            raise ValueError("clarification_reason must be null without clarification")

        if self.should_create_draft:
            self._validate_confirmable_transaction()
        elif self.intent == BenchmarkIntent.CREATE_TRANSACTION:
            self._validate_transaction_clarification_or_non_draft()

        if self.intent in ANALYTICAL_INTENTS:
            self._validate_analytical_intent()

        if self.intent == BenchmarkIntent.UNKNOWN:
            self._validate_unknown_intent()

        if self.date_label is not None and self.date_range_label is not None:
            raise ValueError("date_label and date_range_label cannot both be set")

        return self

    def _validate_confirmable_transaction(self) -> None:
        if self.intent != BenchmarkIntent.CREATE_TRANSACTION:
            raise ValueError("only create_transaction can create a draft")
        for field_name in self.transaction_required_fields:
            if getattr(self, field_name) in {None, ""}:
                raise ValueError(f"{field_name} is required for a draft")
        if self.amount_minor is None or self.amount_minor <= 0:
            raise ValueError("draft amount_minor must be positive")
        if self.transaction_type == TransactionType.EXPENSE:
            if self.category_slug not in EXPENSE_CATEGORIES:
                raise ValueError("expense draft requires an expense category")
        elif self.transaction_type == TransactionType.INCOME:
            if self.category_slug not in INCOME_CATEGORIES:
                raise ValueError("income draft requires an income category")

    def _validate_transaction_clarification_or_non_draft(self) -> None:
        if self.should_create_draft:
            return
        if not self.needs_clarification:
            raise ValueError("non-draft create_transaction samples must clarify")
        if self.transaction_type is None and self.clarification_reason not in {
            ClarificationReason.AMBIGUOUS_INTENT,
        }:
            raise ValueError(
                "create_transaction clarification needs transaction_type when known"
            )
        if self.amount_minor is not None and self.amount_minor <= 0:
            raise ValueError("amount_minor must be positive when present")
        if self.transaction_type == TransactionType.EXPENSE and (
            self.category_slug is not None
            and self.category_slug not in EXPENSE_CATEGORIES
        ):
            raise ValueError("expense sample cannot use an income category")
        if self.transaction_type == TransactionType.INCOME and (
            self.category_slug is not None
            and self.category_slug not in INCOME_CATEGORIES
        ):
            raise ValueError("income sample cannot use an expense category")

    def _validate_analytical_intent(self) -> None:
        if self.should_create_draft:
            raise ValueError("analytical intents cannot create drafts")
        if self.transaction_type is not None:
            raise ValueError("analytical intents cannot set transaction_type")
        if self.amount_minor is not None:
            raise ValueError("analytical intents cannot set amount_minor")
        if self.description is not None:
            raise ValueError("analytical intents cannot set description")
        if self.date_label is not None:
            raise ValueError("analytical intents cannot set date_label")
        if self.currency not in {Currency.VND, None}:
            raise ValueError("analytical currency must be VND or null")
        if not self.needs_clarification and self.date_range_label is None:
            raise ValueError("answered analytical samples require date_range_label")
        if (
            self.intent == BenchmarkIntent.SPENDING_BREAKDOWN
            and self.category_slug is not None
        ):
            raise ValueError(
                "spending_breakdown is category-level and must not preselect a category"
            )
        if (
            self.intent == BenchmarkIntent.BUDGET_REMAINING
            and not self.needs_clarification
            and self.category_slug not in EXPENSE_CATEGORIES
        ):
            raise ValueError("budget_remaining requires an expense category")
        if (
            self.intent == BenchmarkIntent.QUERY_SPENDING
            and self.category_slug is not None
            and self.category_slug not in EXPENSE_CATEGORIES
        ):
            raise ValueError("query_spending category must be an expense category")

    def _validate_unknown_intent(self) -> None:
        if self.should_create_draft:
            raise ValueError("unknown intent cannot create drafts")
        if self.transaction_type is not None:
            raise ValueError("unknown intent cannot set transaction_type")
        if self.amount_minor is not None:
            raise ValueError("unknown intent cannot set amount_minor")
        if self.currency is not None:
            raise ValueError("unknown intent cannot set currency")
        if self.category_slug is not None:
            raise ValueError("unknown intent cannot set category_slug")
        if self.description is not None:
            raise ValueError("unknown intent cannot set description")
        if self.date_label is not None or self.date_range_label is not None:
            raise ValueError("unknown intent cannot set date labels")


class ValidationSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str
    valid: bool
    record_count: int
    split_counts: dict[str, int]
    intent_counts: dict[str, int]
    tag_counts: dict[str, int]
    duplicate_status: str
    checksum: str | None
    errors: list[str]
