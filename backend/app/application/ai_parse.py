import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

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
from app.domain.categories import (
    CategoryAliasMatch,
    CategoryValidationError,
    get_category_for_transaction,
    resolve_expense_category_match,
    resolve_expense_category_slug,
)
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


@dataclass(frozen=True, slots=True)
class ParsedMoneyCandidate:
    amount_minor: int
    start: int
    end: int


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
    current_time = now or _utc_now()
    provider_result = _recover_create_transaction_result(
        provider_result,
        command,
        now=current_time,
    )

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


def _recover_create_transaction_result(
    result: TransactionParseResult,
    command: AiParseCommand,
    *,
    now: datetime,
) -> TransactionParseResult:
    if result.intent not in {
        SupportedIntent.UNKNOWN,
        SupportedIntent.CREATE_TRANSACTION,
    }:
        return result

    message = command.message
    normalized = _normalize_vietnamese_text(message)
    if _is_non_transaction_message(normalized):
        return result

    money_candidates = _extract_money_candidates(message)
    has_provider_amount = result.amount_minor is not None and result.amount_minor > 0
    recovered_type_for_amount = _recover_transaction_type(normalized)
    if (
        not has_provider_amount
        and len(money_candidates) > 1
        and recovered_type_for_amount
    ):
        return result.model_copy(
            update={
                "intent": SupportedIntent.CREATE_TRANSACTION,
                "transaction_type": recovered_type_for_amount,
                "currency": result.currency or command.default_currency,
                "needs_confirmation": True,
                "confidence": Confidence.LOW,
                "missing_fields": ["amount_minor"],
            }
        )
    if not has_provider_amount and len(money_candidates) != 1:
        return result
    if not has_provider_amount and money_candidates[0].amount_minor <= 0:
        return result

    transaction_type = result.transaction_type
    if transaction_type is None:
        transaction_type = recovered_type_for_amount
    if transaction_type is None:
        return result

    category_slug = result.category_slug
    if transaction_type == TransactionType.EXPENSE.value:
        original_category_slug = category_slug
        category_slug = _recover_expense_category_slug(category_slug, message)
        if category_slug is None and _has_expense_signal(normalized):
            # Keep create intent so the existing clarification path asks for a category.
            category_slug = None
    elif transaction_type == TransactionType.INCOME.value:
        category_slug = _recover_income_category_slug(category_slug, normalized)

    description = result.description
    if description is None or not description.strip():
        description = _recover_description(transaction_type, message)
    elif (
        result.intent is SupportedIntent.CREATE_TRANSACTION
        and not result.missing_fields
        and transaction_type == TransactionType.EXPENSE.value
        and original_category_slug == category_slug
    ):
        description = description.strip()
    else:
        description = _clean_description(description)

    occurred_at_iso = result.occurred_at_iso
    occurred_at_text = result.occurred_at_text
    recovered_date = _recover_occurred_at(message, command.timezone, now=now)
    if occurred_at_iso is None and recovered_date is not None:
        occurred_at_iso = recovered_date.isoformat()
        occurred_at_text = _recover_occurred_at_text(message) or occurred_at_text

    amount_minor = result.amount_minor
    if amount_minor is None and len(money_candidates) == 1:
        amount_minor = money_candidates[0].amount_minor

    if result.intent is SupportedIntent.UNKNOWN and transaction_type is None:
        return result

    recovered_fields = [
        field
        for field in _normalize_missing_fields(result.missing_fields)
        if field != "intent"
    ]
    for field, value in (
        ("transaction_type", transaction_type),
        ("amount_minor", amount_minor),
        ("currency", result.currency or command.default_currency),
        ("category_slug", category_slug),
        ("description", description),
    ):
        if value is not None and not (isinstance(value, str) and not value.strip()):
            recovered_fields = [
                existing for existing in recovered_fields if existing != field
            ]

    update = {
        "intent": SupportedIntent.CREATE_TRANSACTION,
        "transaction_type": transaction_type,
        "amount_minor": amount_minor,
        "currency": result.currency or command.default_currency,
        "category_slug": category_slug,
        "description": description,
        "occurred_at_text": occurred_at_text,
        "occurred_at_iso": occurred_at_iso,
        "missing_fields": recovered_fields,
    }
    changed = (
        result.intent is not SupportedIntent.CREATE_TRANSACTION
        or transaction_type != result.transaction_type
        or amount_minor != result.amount_minor
        or (result.currency or command.default_currency) != result.currency
        or category_slug != result.category_slug
        or description != result.description
        or occurred_at_iso != result.occurred_at_iso
        or recovered_fields != result.missing_fields
    )
    if not changed:
        return result

    return result.model_copy(
        update={
            **update,
            "needs_confirmation": (
                result.needs_confirmation
                or result.intent is SupportedIntent.UNKNOWN
                or bool(result.missing_fields)
            ),
            "confidence": (
                result.confidence
                if result.intent is SupportedIntent.CREATE_TRANSACTION
                else Confidence.MEDIUM
            ),
        }
    )


def _recover_transaction_type(normalized: str) -> str | None:
    if _has_income_signal(normalized):
        return TransactionType.INCOME.value
    if _has_expense_signal(normalized):
        return TransactionType.EXPENSE.value
    return None


def _recover_expense_category_slug(
    provider_value: str | None,
    message: str,
) -> str | None:
    if provider_value is not None and provider_value.strip():
        return resolve_expense_category_slug(provider_value)
    return resolve_expense_category_slug(None, fallback_text=message)


def _recover_income_category_slug(
    provider_value: str | None,
    normalized_message: str,
) -> str | None:
    if provider_value in {"salary", "bonus", "gift", "other_income"}:
        return provider_value
    if any(
        signal in normalized_message for signal in ("nhan luong", "tra luong", "luong")
    ):
        return "salary"
    if any(
        signal in normalized_message
        for signal in ("nhan thuong", "duoc thuong", "thuong")
    ):
        return "bonus"
    if any(signal in normalized_message for signal in ("duoc cho", "qua tang")):
        return "gift"
    return provider_value


def _recover_description(transaction_type: str | None, message: str) -> str | None:
    normalized = _normalize_vietnamese_text(message)
    if transaction_type == TransactionType.INCOME.value:
        if "luong" in normalized:
            return "Lương"
        if "thuong" in normalized:
            return "Thưởng"
        if "duoc cho" in normalized:
            return "Tiền được cho"
        return "Thu nhập"

    match = resolve_expense_category_match(message)
    if match is None:
        return None
    return _description_from_category_match(match, normalized)


def _description_from_category_match(
    match: CategoryAliasMatch,
    normalized_message: str,
) -> str:
    if match.slug == "transport" and (
        "do xang" in normalized_message
        or ("do" in normalized_message and "xang" in normalized_message)
    ):
        return "Đổ xăng"
    if match.slug == "transport" and "grab" in normalized_message:
        return "Grab"
    if match.slug == "health" and "thuoc" in normalized_message:
        return "Thuốc"
    if match.slug == "entertainment" and "xem phim" in normalized_message:
        return "Xem phim"
    return _title_case_vietnamese(match.alias)


def _clean_description(value: str) -> str:
    cleaned = re.sub(
        r"\b\d+(?:[.,]\d+)?\s*(?:k|nghin|ngan|tr|trieu|m)\b",
        "",
        value,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,-")
    return _title_case_vietnamese(cleaned) if cleaned else value.strip()


def _title_case_vietnamese(value: str) -> str:
    lowered = value.strip().lower()
    if not lowered:
        return value
    return lowered[0].upper() + lowered[1:]


def _recover_occurred_at(
    message: str,
    timezone: str,
    *,
    now: datetime,
) -> datetime | None:
    label = _recover_occurred_at_text(message)
    if label is None:
        return None
    try:
        zone = ZoneInfo(timezone)
    except ZoneInfoNotFoundError:
        zone = ZoneInfo("Asia/Ho_Chi_Minh")

    local_now = now.astimezone(zone)
    if "qua" in _normalize_vietnamese_text(label):
        local_now = local_now - timedelta(days=1)
    return local_now.astimezone(UTC)


def _recover_occurred_at_text(message: str) -> str | None:
    normalized = _normalize_vietnamese_text(message)
    for phrase in (
        "sang nay",
        "trua nay",
        "chieu nay",
        "toi nay",
        "hom nay",
        "vua roi",
        "sang qua",
        "toi qua",
        "hom qua",
    ):
        if phrase in normalized:
            return (
                phrase.replace("sang", "sáng")
                .replace("trua", "trưa")
                .replace("chieu", "chiều")
                .replace("toi", "tối")
                .replace("hom", "hôm")
                .replace("vua", "vừa")
            )
    return None


def _extract_money_candidates(message: str) -> list[ParsedMoneyCandidate]:
    candidates: list[ParsedMoneyCandidate] = []
    normalized = _normalize_vietnamese_text(message, keep_numeric_separators=True)

    patterns = (
        (
            re.compile(
                r"(?<![\w])(?P<number>\d+(?:[,.]\d+)?)\s*(?P<unit>trieu|tr|m)\b"
            ),
            1_000_000,
        ),
        (re.compile(r"(?<![\w])(?P<number>\d+)\s*(?P<unit>k|nghin|ngan)\b"), 1_000),
        (re.compile(r"(?<![\w])(?P<number>\d{1,3}(?:[ .]\d{3})+)(?!\w)"), 1),
    )
    for pattern, multiplier in patterns:
        for match in pattern.finditer(normalized):
            if _is_time_token(normalized, match.start(), match.end()):
                continue
            if multiplier == 1_000_000:
                number_text = match.group("number").replace(" ", "").replace(",", ".")
                amount = int(float(number_text) * multiplier)
            elif multiplier == 1:
                number_text = match.group("number").replace(" ", "").replace(".", "")
                amount = int(number_text)
            else:
                number_text = match.group("number").replace(" ", "").replace(".", "")
                amount = int(number_text) * multiplier
            if amount > 0:
                candidates.append(
                    ParsedMoneyCandidate(
                        amount_minor=amount,
                        start=match.start(),
                        end=match.end(),
                    )
                )

    candidates.sort(key=lambda candidate: (candidate.start, candidate.end))
    deduped: list[ParsedMoneyCandidate] = []
    seen_spans: set[tuple[int, int]] = set()
    for candidate in candidates:
        span = (candidate.start, candidate.end)
        if span not in seen_spans:
            seen_spans.add(span)
            deduped.append(candidate)
    return deduped


def _is_time_token(value: str, start: int, end: int) -> bool:
    suffix = value[end : end + 1]
    prefix = value[max(0, start - 1) : start]
    return suffix == "h" or prefix == "h"


def _has_expense_signal(normalized: str) -> bool:
    return any(
        signal in normalized
        for signal in (
            " an",
            "an ",
            "uong",
            "mua",
            "tra",
            "thanh toan",
            "dong tien",
            "do xang",
            "xang",
            "di grab",
            "grab",
            "bat taxi",
            "taxi",
            "xem phim",
            "thue",
            "het",
            "ton",
            "chi",
            "tieu",
            "lam to",
            "quat ly",
        )
    )


def _has_income_signal(normalized: str) -> bool:
    return any(
        signal in normalized
        for signal in (
            "nhan luong",
            "duoc tra luong",
            "nhan thuong",
            "duoc thuong",
            "nhan tien",
            "duoc cho",
            "tien ve",
            "thu nhap",
        )
    )


def _is_non_transaction_message(normalized: str) -> bool:
    if "?" in normalized:
        return True
    return any(
        signal in normalized
        for signal in (
            "co dat khong",
            "con ",
            "ngan sach",
            "bao nhieu",
            "neu ",
            "moi ngay",
            "thi sao",
        )
    )


def _normalize_vietnamese_text(
    value: str,
    *,
    keep_numeric_separators: bool = False,
) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().casefold())
    without_marks = "".join(
        character for character in normalized if unicodedata.category(character) != "Mn"
    ).replace("đ", "d")
    allowed = r"[^a-z0-9,.?\s]+" if keep_numeric_separators else r"[^a-z0-9?\s]+"
    return re.sub(r"\s+", " ", re.sub(allowed, " ", without_marks)).strip()


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
