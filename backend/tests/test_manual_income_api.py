import asyncio
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.conftest import (
    count_transactions,
    fetch_account,
    fetch_transaction,
    seed_cash_account,
)

INCOME_PAYLOAD: dict[str, Any] = {
    "type": "income",
    "amount_minor": 10_000_000,
    "currency": "VND",
    "category_slug": "salary",
    "description": "lương tháng 7",
    "occurred_at": "2026-07-11T09:00:00+07:00",
    "source": "manual",
}


def test_create_manual_income_persists_transaction_and_updates_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory))

    response = client.post("/api/v1/transactions", json=INCOME_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "income"
    assert body["amount_minor"] == 10_000_000
    assert body["currency"] == "VND"
    assert body["category_slug"] == "salary"
    assert body["description"] == "lương tháng 7"
    assert body["occurred_at"] == "2026-07-11T09:00:00+07:00"
    assert body["source"] == "manual"

    account = asyncio.run(fetch_account(session_factory))
    transaction = asyncio.run(fetch_transaction(session_factory))

    assert account.current_balance_minor == 11_000_000
    assert transaction.id == body["id"]
    assert transaction.account_id == account.id
    assert transaction.type == "income"
    assert transaction.source == "manual"


def test_create_manual_income_creates_default_account_when_missing(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client

    response = client.post("/api/v1/transactions", json=INCOME_PAYLOAD)

    assert response.status_code == 201
    account = asyncio.run(fetch_account(session_factory))
    assert account.opening_balance_minor == 0
    assert account.current_balance_minor == 10_000_000


def test_expense_category_is_rejected_for_income_without_mutation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory))
    payload = {**INCOME_PAYLOAD, "category_slug": "food"}

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "category food cannot be used for income"
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_unsupported_currency_is_rejected_for_income_without_mutation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory))
    payload = {**INCOME_PAYLOAD, "currency": "USD"}

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "unsupported currency: USD"
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


@pytest.mark.parametrize("amount", [1000.5, 0, -1000])
def test_invalid_income_amount_is_rejected_without_mutation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    amount: float | int,
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory))
    payload = {**INCOME_PAYLOAD, "amount_minor": amount}

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 422
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_unknown_income_category_is_rejected_without_mutation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory))
    payload = {**INCOME_PAYLOAD, "category_slug": "not-a-category"}

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "unknown category: not-a-category"
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_income_currency_must_match_account_without_mutation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, currency="USD"))

    response = client.post("/api/v1/transactions", json=INCOME_PAYLOAD)

    assert response.status_code == 422
    assert (
        response.json()["detail"] == "transaction currency must match account currency"
    )
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0
