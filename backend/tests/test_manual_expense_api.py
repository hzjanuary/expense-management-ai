import asyncio
from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db.models import AccountModel, TransactionModel
from app.db.session import create_engine, create_session_factory, get_db_session
from app.main import create_app

DEFAULT_PAYLOAD: dict[str, Any] = {
    "type": "expense",
    "amount_minor": 35000,
    "currency": "VND",
    "category_slug": "food",
    "description": "ăn trưa",
    "occurred_at": "2026-07-11T12:00:00+07:00",
    "source": "manual",
}


@pytest.fixture
def manual_expense_client(
    tmp_path: Path,
) -> Iterator[tuple[TestClient, async_sessionmaker[AsyncSession]]]:
    database_path = tmp_path / "manual-expense.db"
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
    async with session_factory() as session:
        async with session.begin():
            session.add(
                AccountModel(
                    name="Cash Wallet",
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


async def fetch_transaction(
    session_factory: async_sessionmaker[AsyncSession],
) -> TransactionModel:
    async with session_factory() as session:
        result = await session.execute(select(TransactionModel))
        return result.scalar_one()


def test_create_manual_expense_persists_transaction_and_updates_balance(
    manual_expense_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = manual_expense_client
    asyncio.run(seed_cash_account(session_factory))

    response = client.post("/api/v1/transactions", json=DEFAULT_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "expense"
    assert body["amount_minor"] == 35000
    assert body["currency"] == "VND"
    assert body["category_slug"] == "food"
    assert body["description"] == "ăn trưa"
    assert body["occurred_at"] == "2026-07-11T12:00:00+07:00"
    assert body["source"] == "manual"

    account = asyncio.run(fetch_account(session_factory))
    transaction = asyncio.run(fetch_transaction(session_factory))

    assert account.current_balance_minor == 965000
    assert transaction.id == body["id"]
    assert transaction.account_id == account.id
    assert transaction.type == "expense"
    assert transaction.source == "manual"


def test_create_manual_expense_creates_default_account_when_missing(
    manual_expense_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = manual_expense_client

    response = client.post("/api/v1/transactions", json=DEFAULT_PAYLOAD)

    assert response.status_code == 201
    account = asyncio.run(fetch_account(session_factory))
    assert account.opening_balance_minor == 0
    assert account.current_balance_minor == -35000


@pytest.mark.parametrize("amount", [35.5, 0, -35000])
def test_invalid_amount_is_rejected_without_mutation(
    manual_expense_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    amount: float | int,
) -> None:
    client, session_factory = manual_expense_client
    asyncio.run(seed_cash_account(session_factory))
    payload = {**DEFAULT_PAYLOAD, "amount_minor": amount}

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 422
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_unsupported_currency_is_rejected_without_mutation(
    manual_expense_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = manual_expense_client
    asyncio.run(seed_cash_account(session_factory))
    payload = {**DEFAULT_PAYLOAD, "currency": "USD"}

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "unsupported currency: USD"
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_income_category_is_rejected_for_expense_without_mutation(
    manual_expense_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = manual_expense_client
    asyncio.run(seed_cash_account(session_factory))
    payload = {**DEFAULT_PAYLOAD, "category_slug": "salary"}

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "category salary cannot be used for expense"
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_unknown_category_is_rejected_without_mutation(
    manual_expense_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = manual_expense_client
    asyncio.run(seed_cash_account(session_factory))
    payload = {**DEFAULT_PAYLOAD, "category_slug": "not-a-category"}

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "unknown category: not-a-category"
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_currency_must_match_account_without_mutation(
    manual_expense_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = manual_expense_client
    asyncio.run(seed_cash_account(session_factory, currency="USD"))

    response = client.post("/api/v1/transactions", json=DEFAULT_PAYLOAD)

    assert response.status_code == 422
    assert (
        response.json()["detail"] == "transaction currency must match account currency"
    )
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_health_does_not_require_database_connection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    monkeypatch.setenv(
        "POCKET_LEDGER_DATABASE_URL",
        "sqlite+aiosqlite:////tmp/pocket-ledger-health-missing/health.db",
    )

    app: FastAPI = create_app()
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    get_settings.cache_clear()
