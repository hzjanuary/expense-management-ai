from datetime import datetime

from sqlalchemy import Select, func, or_, select
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


async def list_transactions(
    session: AsyncSession,
    *,
    month_start: datetime | None,
    month_end: datetime | None,
    category_slug: str | None,
    transaction_type: str | None,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[TransactionModel], int]:
    statement = _filtered_transactions_statement(
        month_start=month_start,
        month_end=month_end,
        category_slug=category_slug,
        transaction_type=transaction_type,
        q=q,
    )

    total_result = await session.execute(
        select(func.count()).select_from(statement.subquery())
    )
    total = total_result.scalar_one()

    items_result = await session.execute(
        statement.order_by(
            TransactionModel.occurred_at.desc(),
            TransactionModel.created_at.desc(),
            TransactionModel.id.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    return list(items_result.scalars().all()), total


def _filtered_transactions_statement(
    *,
    month_start: datetime | None,
    month_end: datetime | None,
    category_slug: str | None,
    transaction_type: str | None,
    q: str | None,
) -> Select[tuple[TransactionModel]]:
    statement = select(TransactionModel).where(TransactionModel.deleted_at.is_(None))

    if month_start is not None and month_end is not None:
        statement = statement.where(
            TransactionModel.occurred_at >= month_start,
            TransactionModel.occurred_at < month_end,
        )
    if category_slug is not None:
        statement = statement.where(TransactionModel.category_slug == category_slug)
    if transaction_type is not None:
        statement = statement.where(TransactionModel.type == transaction_type)
    if q is not None:
        search = f"%{q}%"
        statement = statement.where(
            or_(
                TransactionModel.description.ilike(search),
                TransactionModel.merchant.ilike(search),
            )
        )

    return statement
