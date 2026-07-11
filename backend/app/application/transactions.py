from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import AccountModel, TransactionModel
from app.db.repositories import (
    create_default_account,
    create_transaction,
    get_default_account,
)
from app.domain.categories import CategoryValidationError, get_category_for_transaction
from app.domain.enums import TransactionType
from app.domain.money import Money, MoneyValidationError


class TransactionValidationError(ValueError):
    """Raised when a transaction command violates deterministic ledger rules."""


@dataclass(frozen=True, slots=True)
class CreateExpenseCommand:
    type: str
    amount_minor: int
    currency: str
    category_slug: str
    description: str
    occurred_at: datetime
    source: str


@dataclass(frozen=True, slots=True)
class CreateExpenseResult:
    transaction: TransactionModel
    account_balance_minor: int


async def create_manual_expense(
    session: AsyncSession,
    command: CreateExpenseCommand,
) -> CreateExpenseResult:
    if command.type != TransactionType.EXPENSE.value:
        raise TransactionValidationError("only expense transactions are supported")

    if command.source != "manual":
        raise TransactionValidationError("only manual source is supported")

    try:
        money = Money(
            amount_minor=command.amount_minor,
            currency=command.currency,
        )
        category = get_category_for_transaction(
            command.category_slug,
            TransactionType.EXPENSE,
        )
    except (MoneyValidationError, CategoryValidationError) as error:
        raise TransactionValidationError(str(error)) from error

    settings = get_settings()

    async with session.begin():
        account = await get_default_account(session, settings.default_account_name)
        if account is None:
            account = await create_default_account(
                session,
                name=settings.default_account_name,
                currency=settings.default_currency,
                opening_balance_minor=settings.default_account_opening_balance_minor,
            )

        _validate_account_currency(account, money.currency)
        account.current_balance_minor -= money.amount_minor

        transaction = await create_transaction(
            session,
            account_id=account.id,
            transaction_type=TransactionType.EXPENSE.value,
            amount_minor=money.amount_minor,
            currency=money.currency,
            category_slug=category.slug,
            description=command.description,
            occurred_at=command.occurred_at,
            source="manual",
        )

    return CreateExpenseResult(
        transaction=transaction,
        account_balance_minor=account.current_balance_minor,
    )


def _validate_account_currency(account: AccountModel, currency: str) -> None:
    if account.currency != currency:
        raise TransactionValidationError(
            "transaction currency must match account currency"
        )
