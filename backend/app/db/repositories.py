from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AccountModel, TransactionModel


async def get_default_account(
    session: AsyncSession,
    name: str,
) -> AccountModel | None:
    result = await session.execute(
        select(AccountModel).where(AccountModel.name == name)
    )
    return result.scalar_one_or_none()


async def create_default_account(
    session: AsyncSession,
    *,
    name: str,
    currency: str,
    opening_balance_minor: int,
) -> AccountModel:
    account = AccountModel(
        name=name,
        currency=currency,
        opening_balance_minor=opening_balance_minor,
        current_balance_minor=opening_balance_minor,
    )
    session.add(account)
    await session.flush()
    return account


async def create_transaction(
    session: AsyncSession,
    *,
    account_id: str,
    transaction_type: str,
    amount_minor: int,
    currency: str,
    category_slug: str,
    description: str,
    occurred_at: datetime,
    source: str,
) -> TransactionModel:
    transaction = TransactionModel(
        account_id=account_id,
        type=transaction_type,
        amount_minor=amount_minor,
        currency=currency,
        category_slug=category_slug,
        description=description,
        occurred_at=occurred_at,
        source=source,
    )
    session.add(transaction)
    await session.flush()
    return transaction
