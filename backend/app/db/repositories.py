from datetime import datetime

from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    AccountModel,
    AiTransactionDraftModel,
    BudgetPeriodModel,
    CategoryBudgetModel,
    TransactionModel,
)


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
    merchant: str | None = None,
    raw_user_text: str | None = None,
    parser_confidence: str | None = None,
) -> TransactionModel:
    transaction = TransactionModel(
        account_id=account_id,
        type=transaction_type,
        amount_minor=amount_minor,
        currency=currency,
        category_slug=category_slug,
        description=description,
        merchant=merchant,
        occurred_at=occurred_at,
        source=source,
        raw_user_text=raw_user_text,
        parser_confidence=parser_confidence,
    )
    session.add(transaction)
    await session.flush()
    return transaction


async def create_ai_transaction_draft(
    session: AsyncSession,
    *,
    intent: str,
    transaction_type: str,
    amount_minor: int,
    currency: str,
    category_slug: str,
    description: str,
    merchant: str | None,
    occurred_at: datetime | None,
    occurred_at_text: str | None,
    source: str,
    confidence: str,
    needs_confirmation: bool,
    missing_fields_json: str,
    raw_user_text: str,
    provider_name: str,
    model_name: str,
    status: str,
    expires_at: datetime,
) -> AiTransactionDraftModel:
    draft = AiTransactionDraftModel(
        intent=intent,
        transaction_type=transaction_type,
        amount_minor=amount_minor,
        currency=currency,
        category_slug=category_slug,
        description=description,
        merchant=merchant,
        occurred_at=occurred_at,
        occurred_at_text=occurred_at_text,
        source=source,
        confidence=confidence,
        needs_confirmation=needs_confirmation,
        missing_fields_json=missing_fields_json,
        raw_user_text=raw_user_text,
        provider_name=provider_name,
        model_name=model_name,
        status=status,
        expires_at=expires_at,
    )
    session.add(draft)
    await session.flush()
    return draft


async def get_ai_transaction_draft(
    session: AsyncSession,
    draft_id: str,
) -> AiTransactionDraftModel | None:
    result = await session.execute(
        select(AiTransactionDraftModel).where(AiTransactionDraftModel.id == draft_id)
    )
    return result.scalar_one_or_none()


async def get_budget_period(
    session: AsyncSession,
    *,
    year: int,
    month: int,
    currency: str,
) -> BudgetPeriodModel | None:
    result = await session.execute(
        select(BudgetPeriodModel)
        .options(selectinload(BudgetPeriodModel.category_budgets))
        .where(
            BudgetPeriodModel.year == year,
            BudgetPeriodModel.month == month,
            BudgetPeriodModel.currency == currency,
        )
    )
    return result.scalar_one_or_none()


async def create_budget_period(
    session: AsyncSession,
    *,
    year: int,
    month: int,
    currency: str,
    total_budget_minor: int,
) -> BudgetPeriodModel:
    budget_period = BudgetPeriodModel(
        year=year,
        month=month,
        currency=currency,
        total_budget_minor=total_budget_minor,
    )
    session.add(budget_period)
    await session.flush()
    return budget_period


async def replace_category_budgets(
    session: AsyncSession,
    *,
    budget_period_id: str,
    category_budgets: list[tuple[str, int]],
) -> list[CategoryBudgetModel]:
    await session.execute(
        delete(CategoryBudgetModel).where(
            CategoryBudgetModel.budget_period_id == budget_period_id
        )
    )

    rows = [
        CategoryBudgetModel(
            budget_period_id=budget_period_id,
            category_slug=category_slug,
            budget_minor=budget_minor,
        )
        for category_slug, budget_minor in category_budgets
    ]
    session.add_all(rows)
    await session.flush()
    return rows


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


async def get_total_account_balance_minor(session: AsyncSession) -> int:
    result = await session.execute(
        select(func.coalesce(func.sum(AccountModel.current_balance_minor), 0))
    )
    return int(result.scalar_one())


async def get_monthly_transaction_type_totals(
    session: AsyncSession,
    *,
    month_start: datetime,
    month_end: datetime,
) -> dict[str, int]:
    result = await session.execute(
        select(
            TransactionModel.type,
            func.coalesce(func.sum(TransactionModel.amount_minor), 0),
        )
        .where(
            TransactionModel.deleted_at.is_(None),
            TransactionModel.occurred_at >= month_start,
            TransactionModel.occurred_at < month_end,
        )
        .group_by(TransactionModel.type)
    )
    return {
        str(transaction_type): int(total) for transaction_type, total in result.all()
    }


async def get_monthly_category_breakdown(
    session: AsyncSession,
    *,
    month_start: datetime,
    month_end: datetime,
) -> list[tuple[str, str, int]]:
    result = await session.execute(
        select(
            TransactionModel.category_slug,
            TransactionModel.type,
            func.coalesce(func.sum(TransactionModel.amount_minor), 0),
        )
        .where(
            TransactionModel.deleted_at.is_(None),
            TransactionModel.occurred_at >= month_start,
            TransactionModel.occurred_at < month_end,
        )
        .group_by(TransactionModel.category_slug, TransactionModel.type)
    )
    return [
        (str(category_slug), str(transaction_type), int(amount_minor))
        for category_slug, transaction_type, amount_minor in result.all()
    ]


async def get_monthly_expense_total(
    session: AsyncSession,
    *,
    month_start: datetime,
    month_end: datetime,
) -> int:
    result = await session.execute(
        select(func.coalesce(func.sum(TransactionModel.amount_minor), 0)).where(
            TransactionModel.deleted_at.is_(None),
            TransactionModel.type == "expense",
            TransactionModel.occurred_at >= month_start,
            TransactionModel.occurred_at < month_end,
        )
    )
    return int(result.scalar_one())


async def get_monthly_expense_totals_by_category(
    session: AsyncSession,
    *,
    month_start: datetime,
    month_end: datetime,
) -> dict[str, int]:
    result = await session.execute(
        select(
            TransactionModel.category_slug,
            func.coalesce(func.sum(TransactionModel.amount_minor), 0),
        )
        .where(
            TransactionModel.deleted_at.is_(None),
            TransactionModel.type == "expense",
            TransactionModel.occurred_at >= month_start,
            TransactionModel.occurred_at < month_end,
        )
        .group_by(TransactionModel.category_slug)
    )
    return {str(category_slug): int(total) for category_slug, total in result.all()}


async def get_expense_total_for_category(
    session: AsyncSession,
    *,
    category_slug: str,
    currency: str,
    range_start: datetime,
    range_end: datetime,
) -> tuple[int, int]:
    result = await session.execute(
        select(
            func.coalesce(func.sum(TransactionModel.amount_minor), 0),
            func.count(TransactionModel.id),
        ).where(
            TransactionModel.deleted_at.is_(None),
            TransactionModel.type == "expense",
            TransactionModel.currency == currency,
            TransactionModel.category_slug == category_slug,
            TransactionModel.occurred_at >= range_start,
            TransactionModel.occurred_at < range_end,
        )
    )
    amount_minor, transaction_count = result.one()
    return int(amount_minor), int(transaction_count)


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
