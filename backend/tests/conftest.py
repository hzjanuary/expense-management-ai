import asyncio
from collections.abc import AsyncIterator, Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.base import Base
from app.db.models import AccountModel, AiTransactionDraftModel, TransactionModel
from app.db.session import create_engine, create_session_factory, get_db_session
from app.main import create_app


@pytest.fixture
def transaction_api_client(
    tmp_path: Path,
) -> Iterator[tuple[TestClient, async_sessionmaker[AsyncSession]]]:
    database_path = tmp_path / "transactions.db"
    engine = create_engine(f"sqlite+aiosqlite:///{database_path}")
    session_factory = create_session_factory(engine)

    async def prepare_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(prepare_database())

    app = create_app()

    async def override_get_db_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_get_db_session

    with TestClient(app) as client:
        yield client, session_factory

    app.dependency_overrides.clear()
    asyncio.run(engine.dispose())


async def seed_cash_account(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    balance_minor: int = 1_000_000,
    currency: str = "VND",
) -> None:
    await seed_account(
        session_factory,
        name="Cash Wallet",
        balance_minor=balance_minor,
        currency=currency,
    )


async def seed_account(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    name: str,
    balance_minor: int,
    currency: str = "VND",
) -> None:
    async with session_factory() as session:
        async with session.begin():
            session.add(
                AccountModel(
                    name=name,
                    currency=currency,
                    opening_balance_minor=balance_minor,
                    current_balance_minor=balance_minor,
                )
            )


async def fetch_account(
    session_factory: async_sessionmaker[AsyncSession],
) -> AccountModel:
    async with session_factory() as session:
        result = await session.execute(
            select(AccountModel).where(AccountModel.name == "Cash Wallet")
        )
        return result.scalar_one()


async def count_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> int:
    async with session_factory() as session:
        result = await session.execute(select(func.count(TransactionModel.id)))
        return result.scalar_one()


async def count_ai_transaction_drafts(
    session_factory: async_sessionmaker[AsyncSession],
) -> int:
    async with session_factory() as session:
        result = await session.execute(select(func.count(AiTransactionDraftModel.id)))
        return result.scalar_one()


async def fetch_ai_transaction_draft(
    session_factory: async_sessionmaker[AsyncSession],
    draft_id: str,
) -> AiTransactionDraftModel:
    async with session_factory() as session:
        result = await session.execute(
            select(AiTransactionDraftModel).where(
                AiTransactionDraftModel.id == draft_id
            )
        )
        return result.scalar_one()


async def fetch_transaction(
    session_factory: async_sessionmaker[AsyncSession],
) -> TransactionModel:
    async with session_factory() as session:
        result = await session.execute(select(TransactionModel))
        return result.scalar_one()


async def seed_transaction(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    transaction_id: str,
    transaction_type: str,
    amount_minor: int,
    category_slug: str,
    description: str,
    occurred_at: datetime,
    created_at: datetime | None = None,
    merchant: str | None = None,
    deleted_at: datetime | None = None,
) -> None:
    created = created_at or datetime.now(UTC)
    async with session_factory() as session:
        async with session.begin():
            account_result = await session.execute(
                select(AccountModel).where(AccountModel.name == "Cash Wallet")
            )
            account = account_result.scalar_one_or_none()
            if account is None:
                account = AccountModel(
                    name="Cash Wallet",
                    currency="VND",
                    opening_balance_minor=1_000_000,
                    current_balance_minor=1_000_000,
                )
                session.add(account)
                await session.flush()

            session.add(
                TransactionModel(
                    id=transaction_id,
                    account_id=account.id,
                    type=transaction_type,
                    amount_minor=amount_minor,
                    currency="VND",
                    category_slug=category_slug,
                    description=description,
                    merchant=merchant,
                    occurred_at=occurred_at,
                    source="manual",
                    created_at=created,
                    updated_at=created,
                    deleted_at=deleted_at,
                )
            )
