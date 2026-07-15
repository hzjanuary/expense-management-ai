import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import LlmProvider
from app.ai.schemas import (
    Confidence,
    SupportedIntent,
    TransactionParseRequest,
    TransactionParseResult,
)
from app.application.transactions import (
    CreateManualTransactionCommand,
    CreateManualTransactionResult,
    TransactionValidationError,
    create_validated_transaction_in_session,
)
from app.core.config import get_settings
from app.db.models import AiTransactionDraftModel, TransactionModel
from app.db.repositories import create_ai_transaction_draft, get_ai_transaction_draft
from app.domain.categories import CategoryValidationError, get_category_for_transaction
from app.domain.enums import TransactionType
from app.domain.money import Money, MoneyValidationError


class AiParseValidationError(ValueError):
    """Raised when provider output violates deterministic draft rules."""


class AiDraftNotFoundError(ValueError):
    """Raised when a requested AI draft does not exist."""


class AiDraftConfirmationError(ValueError):
    """Raised when an AI draft cannot be confirmed."""


class AiDraftStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


@dataclass(frozen=True, slots=True)
class AiParseCommand:
    message: str
    locale: str = "vi-VN"
    default_currency: str = "VND"
    timezone: str = "Asia/Ho_Chi_Minh"


@dataclass(frozen=True, slots=True)
class TransactionDraft:
    type: str
    amount_minor: int
    currency: str
    category_slug: str
    description: str
    merchant: str | None
    occurred_at: datetime | None
    source: str = "ai_chat"


@dataclass(frozen=True, slots=True)
class Clarification:
    message: str
    fields: list[str]


@dataclass(frozen=True, slots=True)
class AiParseResult:
    intent: str
    draft_id: str | None
    draft: TransactionDraft | None
    needs_confirmation: bool
    confidence: str
    missing_fields: list[str]
    clarification: Clarification | None = None


@dataclass(frozen=True, slots=True)
class ConfirmAiDraftCommand:
    draft_id: str


@dataclass(frozen=True, slots=True)
class ConfirmAiDraftResult:
    transaction: TransactionModel
    account_balance_minor: int


async def parse_ai_transaction_draft(
    session: AsyncSession,
    provider: LlmProvider,
    command: AiParseCommand,
    *,
    now: datetime | None = None,
) -> AiParseResult:
    request = TransactionParseRequest(
        message=command.message,
        locale=command.locale,
        default_currency=command.default_currency,
        timezone=command.timezone,
    )
    provider_result = await provider.parse_transaction_text(request)

    if provider_result.intent is not SupportedIntent.CREATE_TRANSACTION:
        missing_fields = _normalize_missing_fields(provider_result.missing_fields)
        return AiParseResult(
            intent=provider_result.intent.value,
            draft_id=None,
            draft=None,
            needs_confirmation=provider_result.needs_confirmation,
            confidence=provider_result.confidence.value,
            missing_fields=missing_fields,
            clarification=_build_clarification(
                provider_result.intent.value,
                missing_fields,
            ),
        )

    clarification = _clarification_for_create_transaction_result(provider_result)
    if clarification is not None:
        missing_fields = _normalize_missing_fields(
            provider_result.missing_fields or clarification.fields
        )
        return AiParseResult(
            intent=SupportedIntent.CREATE_TRANSACTION.value,
            draft_id=None,
            draft=None,
            needs_confirmation=True,
            confidence=provider_result.confidence.value,
            missing_fields=missing_fields,
            clarification=clarification,
        )

    draft = _validate_create_transaction_draft(provider_result)
    provider_name, model_name = _provider_identity(provider)
    current_time = now or _utc_now()
    settings = get_settings()
    expires_at = current_time + timedelta(seconds=settings.ai_draft_ttl_seconds)

    async with session.begin():
        draft_model = await create_ai_transaction_draft(
            session,
            intent=SupportedIntent.CREATE_TRANSACTION.value,
            transaction_type=draft.type,
            amount_minor=draft.amount_minor,
            currency=draft.currency,
            category_slug=draft.category_slug,
            description=draft.description,
            merchant=draft.merchant,
            occurred_at=draft.occurred_at,
            occurred_at_text=provider_result.occurred_at_text,
            source=draft.source,
            confidence=provider_result.confidence.value,
            needs_confirmation=provider_result.needs_confirmation,
            missing_fields_json=json.dumps(provider_result.missing_fields),
            raw_user_text=command.message,
            provider_name=provider_name,
            model_name=model_name,
            status=AiDraftStatus.PENDING.value,
            expires_at=expires_at,
        )

    return AiParseResult(
        intent=SupportedIntent.CREATE_TRANSACTION.value,
        draft_id=draft_model.id,
        draft=draft,
        needs_confirmation=provider_result.needs_confirmation,
        confidence=provider_result.confidence.value,
        missing_fields=provider_result.missing_fields,
        clarification=_build_confirmation_clarification(provider_result),
    )


async def confirm_ai_transaction_draft(
    session: AsyncSession,
    command: ConfirmAiDraftCommand,
    *,
    now: datetime | None = None,
) -> CreateManualTransactionResult:
    current_time = now or _utc_now()
    expired_draft = False

    async with session.begin():
        draft = await get_ai_transaction_draft(session, command.draft_id)
        if draft is None:
            raise AiDraftNotFoundError("AI draft not found")

        if draft.status != AiDraftStatus.PENDING.value:
            raise AiDraftConfirmationError("AI draft is not pending")

        if _as_utc(draft.expires_at) <= current_time:
            draft.status = AiDraftStatus.EXPIRED.value
            draft.updated_at = current_time
            expired_draft = True
        else:
            try:
                transaction_command = _draft_to_transaction_command(
                    draft,
                    occurred_at=(
                        current_time if draft.occurred_at is None else draft.occurred_at
                    ),
                )
                result = await create_validated_transaction_in_session(
                    session,
                    transaction_command,
                )
            except (AiParseValidationError, TransactionValidationError) as error:
                raise AiDraftConfirmationError(str(error)) from error

            draft.status = AiDraftStatus.CONFIRMED.value
            draft.created_transaction_id = result.transaction.id
            draft.confirmed_at = current_time
            draft.updated_at = current_time
            return result

    if expired_draft:
        raise AiDraftConfirmationError("AI draft is expired")
    raise AiDraftConfirmationError("AI draft could not be confirmed")


def _validate_create_transaction_draft(
    result: TransactionParseResult,
) -> TransactionDraft:
    transaction_type = _parse_transaction_type(result.transaction_type)
    amount_minor = _require_amount(result)
    currency = _require_currency(result)
    category_slug = _require_category_slug(result)
    description = _require_description(result)

    try:
        money = Money(amount_minor=amount_minor, currency=currency)
        category = get_category_for_transaction(category_slug, transaction_type)
    except (MoneyValidationError, CategoryValidationError) as error:
        raise AiParseValidationError(str(error)) from error

    return TransactionDraft(
        type=transaction_type.value,
        amount_minor=money.amount_minor,
        currency=money.currency,
        category_slug=category.slug,
        description=description,
        merchant=result.merchant,
        occurred_at=_parse_occurred_at(result.occurred_at_iso),
    )


def _clarification_for_create_transaction_result(
    result: TransactionParseResult,
) -> Clarification | None:
    missing_fields = _missing_required_create_transaction_fields(result)
    if missing_fields:
        return _build_clarification(
            SupportedIntent.CREATE_TRANSACTION.value,
            missing_fields,
        )

    try:
        _validate_create_transaction_draft(result)
    except AiParseValidationError as error:
        return _clarification_from_validation_error(str(error))

    return None


def _missing_required_create_transaction_fields(
    result: TransactionParseResult,
) -> list[str]:
    missing_fields = _normalize_missing_fields(result.missing_fields)

    required_checks = (
        ("transaction_type", result.transaction_type),
        ("amount_minor", result.amount_minor),
        ("currency", result.currency),
        ("category_slug", result.category_slug),
        ("description", result.description),
    )
    for field, value in required_checks:
        if value is None:
            missing_fields.append(field)
        elif isinstance(value, str) and not value.strip():
            missing_fields.append(field)

    return _dedupe_fields(missing_fields)


def _normalize_missing_fields(fields: list[str]) -> list[str]:
    normalized = ["intent" if field == "intent" else field for field in fields]
    return _dedupe_fields(normalized)


def _dedupe_fields(fields: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for field in fields:
        if field not in seen:
            seen.add(field)
            deduped.append(field)
    return deduped


def _build_clarification(intent: str, fields: list[str]) -> Clarification:
    normalized_fields = _normalize_missing_fields(fields)
    if intent != SupportedIntent.CREATE_TRANSACTION.value:
        return Clarification(
            message=(
                "Mình chưa hiểu bạn muốn ghi giao dịch hay hỏi thông tin gì. "
                "Bạn có thể nói rõ hơn không?"
            ),
            fields=normalized_fields or ["intent"],
        )

    if "amount_minor" in normalized_fields:
        return Clarification(
            message="Bạn muốn ghi khoản này với số tiền bao nhiêu?",
            fields=["amount_minor"],
        )
    if "category_slug" in normalized_fields:
        return Clarification(
            message="Khoản này thuộc danh mục nào?",
            fields=["category_slug"],
        )
    if "transaction_type" in normalized_fields:
        return Clarification(
            message="Đây là khoản chi hay khoản thu?",
            fields=["transaction_type"],
        )
    if "currency" in normalized_fields:
        return Clarification(
            message="Bạn muốn ghi giao dịch này bằng đơn vị tiền nào?",
            fields=["currency"],
        )
    if "description" in normalized_fields:
        return Clarification(
            message="Bạn muốn mô tả giao dịch này là gì?",
            fields=["description"],
        )

    return Clarification(
        message="Mình cần bạn xác nhận thêm thông tin trước khi ghi sổ.",
        fields=normalized_fields,
    )


def _clarification_from_validation_error(message: str) -> Clarification:
    if "category" in message:
        return Clarification(
            message="Khoản này thuộc danh mục nào?",
            fields=["category_slug"],
        )
    if "transaction_type" in message or "expense and income" in message:
        return Clarification(
            message="Đây là khoản chi hay khoản thu?",
            fields=["transaction_type"],
        )
    if "amount_minor" in message:
        return Clarification(
            message="Bạn muốn ghi khoản này với số tiền bao nhiêu?",
            fields=["amount_minor"],
        )
    if "currency" in message:
        return Clarification(
            message="Bạn muốn ghi giao dịch này bằng đơn vị tiền nào?",
            fields=["currency"],
        )
    return Clarification(
        message="Mình cần bạn xác nhận thêm thông tin trước khi ghi sổ.",
        fields=[],
    )


def _build_confirmation_clarification(
    result: TransactionParseResult,
) -> Clarification | None:
    if result.confidence is not Confidence.LOW:
        return None
    return Clarification(
        message="Mình hiểu giao dịch này nhưng cần bạn xác nhận trước khi ghi sổ.",
        fields=[],
    )


def _parse_transaction_type(value: str | None) -> TransactionType:
    if value is None:
        raise AiParseValidationError("transaction_type is required")
    try:
        transaction_type = TransactionType(value)
    except ValueError as error:
        raise AiParseValidationError("unsupported transaction_type") from error
    if transaction_type not in {TransactionType.EXPENSE, TransactionType.INCOME}:
        raise AiParseValidationError("only expense and income drafts are supported")
    return transaction_type


def _require_amount(result: TransactionParseResult) -> int:
    if result.amount_minor is None:
        raise AiParseValidationError("amount_minor is required")
    if (
        result.confidence is Confidence.HIGH
        and not result.needs_confirmation
        and result.amount_minor <= 0
    ):
        raise AiParseValidationError("amount_minor must be positive")
    return result.amount_minor


def _require_currency(result: TransactionParseResult) -> str:
    if result.currency is None:
        raise AiParseValidationError("currency is required")
    return result.currency


def _require_category_slug(result: TransactionParseResult) -> str:
    if result.category_slug is None:
        raise AiParseValidationError("category_slug is required")
    return result.category_slug


def _require_description(result: TransactionParseResult) -> str:
    if result.description is None or not result.description.strip():
        raise AiParseValidationError("description is required")
    return result.description.strip()


def _parse_occurred_at(value: str | None) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError as error:
        raise AiParseValidationError("occurred_at_iso is invalid") from error


def _draft_to_transaction_command(
    draft: AiTransactionDraftModel,
    *,
    occurred_at: datetime,
) -> CreateManualTransactionCommand:
    parsed_result = TransactionParseResult(
        intent=SupportedIntent.CREATE_TRANSACTION,
        transaction_type=draft.transaction_type,
        amount_minor=draft.amount_minor,
        currency=draft.currency,
        category_slug=draft.category_slug,
        description=draft.description,
        merchant=draft.merchant,
        occurred_at_text=draft.occurred_at_text,
        occurred_at_iso=draft.occurred_at.isoformat() if draft.occurred_at else None,
        needs_confirmation=draft.needs_confirmation,
        confidence=Confidence(draft.confidence),
        missing_fields=json.loads(draft.missing_fields_json),
    )
    validated_draft = _validate_create_transaction_draft(parsed_result)
    return CreateManualTransactionCommand(
        type=validated_draft.type,
        amount_minor=validated_draft.amount_minor,
        currency=validated_draft.currency,
        category_slug=validated_draft.category_slug,
        description=validated_draft.description,
        merchant=validated_draft.merchant,
        occurred_at=occurred_at,
        source="ai_chat",
        raw_user_text=draft.raw_user_text,
        parser_confidence=draft.confidence,
    )


def _provider_identity(provider: LlmProvider) -> tuple[str, str]:
    provider_name = getattr(provider, "provider_name", None)
    model_name = getattr(provider, "model_name", None)

    if provider_name is None and provider.__class__.__name__ == "OllamaLlmProvider":
        provider_name = "ollama"
    if model_name is None and hasattr(provider, "resolved_model_name"):
        model_name = provider.resolved_model_name

    return str(provider_name or "unknown"), str(model_name or "unknown")


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
