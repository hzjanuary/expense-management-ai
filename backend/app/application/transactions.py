import re
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import AccountModel, TransactionModel
from app.db.repositories import (
    create_default_account,
    create_transaction,
    get_default_account,
    get_transaction_for_soft_delete,
    list_transactions,
    mark_transaction_deleted,
)
from app.domain.categories import (
    CategoryValidationError,
    get_category,
    get_category_for_transaction,
)
from app.domain.enums import TransactionType
from app.domain.money import Money, MoneyValidationError
from app.domain.time_ranges import TimeRangeValidationError, month_range_utc


class TransactionValidationError(ValueError):
    """Raised when a transaction command violates deterministic ledger rules."""


class TransactionNotFoundError(ValueError):
    """Raised when a requested transaction does not exist."""


class TransactionAlreadyDeletedError(ValueError):
    """Raised when a requested transaction was already soft-deleted."""


_MONTH_PATTERN = re.compile(r"^(?P<year>\d{4})-(?P<month>\d{2})$")


@dataclass(frozen=True, slots=True)
class CreateManualTransactionCommand:
    type: str
    amount_minor: int
    currency: str
    category_slug: str
    description: str
    occurred_at: datetime
    source: str
    merchant: str | None = None
    raw_user_text: str | None = None
    parser_confidence: str | None = None


@dataclass(frozen=True, slots=True)
class CreateManualTransactionResult:
    transaction: TransactionModel
    account_balance_minor: int


@dataclass(frozen=True, slots=True)
class ListTransactionsQuery:
    month: str | None = None
    category: str | None = None
    type: str | None = None
    q: str | None = None
    limit: int = 50
    offset: int = 0


@dataclass(frozen=True, slots=True)
class ListTransactionsResult:
    items: list[TransactionModel]
    limit: int
    offset: int
    total: int


@dataclass(frozen=True, slots=True)
class SoftDeleteTransactionCommand:
    transaction_id: str
    deleted_at: datetime


@dataclass(frozen=True, slots=True)
class SoftDeleteTransactionResult:
    transaction_id: str
    deleted_at: datetime
    account_balance_minor: int


async def create_manual_transaction(
    session: AsyncSession,
    command: CreateManualTransactionCommand,
) -> CreateManualTransactionResult:
    if command.source != "manual":
        raise TransactionValidationError("only manual source is supported")

    async with session.begin():
        return await create_validated_transaction_in_session(session, command)


async def create_validated_transaction_in_session(
    session: AsyncSession,
    command: CreateManualTransactionCommand,
) -> CreateManualTransactionResult:
    if command.source not in {"manual", "ai_chat"}:
        raise TransactionValidationError("unsupported transaction source")

    transaction_type = _parse_transaction_type(command.type)

    try:
        money = Money(
            amount_minor=command.amount_minor,
            currency=command.currency,
        )
        category = get_category_for_transaction(
            command.category_slug,
            transaction_type,
        )
    except (MoneyValidationError, CategoryValidationError) as error:
        raise TransactionValidationError(str(error)) from error

    settings = get_settings()

    account = await get_default_account(session, settings.default_account_name)
    if account is None:
        account = await create_default_account(
            session,
            name=settings.default_account_name,
            currency=settings.default_currency,
            opening_balance_minor=settings.default_account_opening_balance_minor,
        )

    _validate_account_currency(account, money.currency)
    account.current_balance_minor += _balance_delta(
        transaction_type,
        money.amount_minor,
    )

    transaction = await create_transaction(
        session,
        account_id=account.id,
        transaction_type=transaction_type.value,
        amount_minor=money.amount_minor,
        currency=money.currency,
        category_slug=category.slug,
        description=command.description,
        merchant=command.merchant,
        occurred_at=command.occurred_at,
        source=command.source,
        raw_user_text=command.raw_user_text,
        parser_confidence=command.parser_confidence,
    )

    return CreateManualTransactionResult(
        transaction=transaction,
        account_balance_minor=account.current_balance_minor,
    )


async def soft_delete_transaction(
    session: AsyncSession,
    command: SoftDeleteTransactionCommand,
) -> SoftDeleteTransactionResult:
    async with session.begin():
        transaction = await get_transaction_for_soft_delete(
            session,
            command.transaction_id,
        )
        if transaction is None:
            raise TransactionNotFoundError("transaction not found")
        if transaction.deleted_at is not None:
            raise TransactionAlreadyDeletedError("transaction is already deleted")

        transaction_type = _parse_transaction_type(transaction.type)
        account = transaction.account
        account.current_balance_minor -= _balance_delta(
            transaction_type,
            transaction.amount_minor,
        )
        await mark_transaction_deleted(
            session,
            transaction,
            deleted_at=command.deleted_at,
        )

        return SoftDeleteTransactionResult(
            transaction_id=transaction.id,
            deleted_at=command.deleted_at,
            account_balance_minor=account.current_balance_minor,
        )


async def list_filtered_transactions(
    session: AsyncSession,
    query: ListTransactionsQuery,
) -> ListTransactionsResult:
    month_start, month_end = _parse_month_range(query.month)
    category_slug = _parse_category_filter(query.category)
    transaction_type = _parse_optional_transaction_type(query.type)
    search_text = _parse_search_text(query.q)

    items, total = await list_transactions(
        session,
        month_start=month_start,
        month_end=month_end,
        category_slug=category_slug,
        transaction_type=transaction_type.value if transaction_type else None,
        q=search_text,
        limit=query.limit,
        offset=query.offset,
    )

    return ListTransactionsResult(
        items=items,
        limit=query.limit,
        offset=query.offset,
        total=total,
    )


CreateExpenseCommand = CreateManualTransactionCommand
CreateExpenseResult = CreateManualTransactionResult
create_manual_expense = create_manual_transaction


def _parse_transaction_type(value: str) -> TransactionType:
    try:
        transaction_type = TransactionType(value)
    except ValueError as error:
        raise TransactionValidationError(
            "only expense and income transactions are supported"
        ) from error

    if transaction_type not in {TransactionType.EXPENSE, TransactionType.INCOME}:
        raise TransactionValidationError(
            "only expense and income transactions are supported"
        )
    return transaction_type


def _parse_optional_transaction_type(value: str | None) -> TransactionType | None:
    if value is None:
        return None
    return _parse_transaction_type(value)


def _parse_month_range(value: str | None) -> tuple[datetime | None, datetime | None]:
    if value is None:
        return None, None

    match = _MONTH_PATTERN.match(value)
    if match is None:
        raise TransactionValidationError("month must use YYYY-MM format")

    year = int(match.group("year"))
    month = int(match.group("month"))
    if month < 1 or month > 12:
        raise TransactionValidationError("month must use YYYY-MM format")

    try:
        return month_range_utc(year, month, get_settings().default_timezone)
    except TimeRangeValidationError as error:
        raise TransactionValidationError(str(error)) from error


def _parse_category_filter(value: str | None) -> str | None:
    if value is None:
        return None
    try:
        return get_category(value).slug
    except CategoryValidationError as error:
        raise TransactionValidationError(str(error)) from error


def _parse_search_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


def _balance_delta(transaction_type: TransactionType, amount_minor: int) -> int:
    if transaction_type is TransactionType.EXPENSE:
        return -amount_minor
    if transaction_type is TransactionType.INCOME:
        return amount_minor
    raise TransactionValidationError("unsupported transaction type")


def _validate_account_currency(account: AccountModel, currency: str) -> None:
    if account.currency != currency:
        raise TransactionValidationError(
            "transaction currency must match account currency"
        )
