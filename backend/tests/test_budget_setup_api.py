import asyncio
from datetime import UTC, datetime
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import BudgetPeriodModel, CategoryBudgetModel
from tests.conftest import (
    count_transactions,
    fetch_account,
    seed_cash_account,
    seed_transaction,
)

DEFAULT_BUDGET_PAYLOAD: dict[str, Any] = {
    "currency": "VND",
    "total_budget_minor": 5_000_000,
    "category_budgets": [
        {"category_slug": "food", "budget_minor": 2_000_000},
        {"category_slug": "transport", "budget_minor": 800_000},
    ],
}


async def count_budget_periods(
    session_factory: async_sessionmaker[AsyncSession],
) -> int:
    async with session_factory() as session:
        result = await session.execute(select(func.count(BudgetPeriodModel.id)))
        return result.scalar_one()


async def count_category_budgets(
    session_factory: async_sessionmaker[AsyncSession],
) -> int:
    async with session_factory() as session:
        result = await session.execute(select(func.count(CategoryBudgetModel.id)))
        return result.scalar_one()


def put_budget(client: TestClient, payload: dict[str, Any] | None = None):
    return client.put(
        "/api/v1/budgets/monthly/2026/7",
        json=payload or DEFAULT_BUDGET_PAYLOAD,
    )


def test_create_monthly_budget_persists_period_and_category_budgets(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client

    response = put_budget(client)

    assert response.status_code == 200
    assert response.json() == {
        "year": 2026,
        "month": 7,
        "currency": "VND",
        "total_budget_minor": 5_000_000,
        "category_budgets": [
            {"category_slug": "food", "budget_minor": 2_000_000},
            {"category_slug": "transport", "budget_minor": 800_000},
        ],
    }
    assert asyncio.run(count_budget_periods(session_factory)) == 1
    assert asyncio.run(count_category_budgets(session_factory)) == 2


def test_get_monthly_budget_returns_saved_setup(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    assert put_budget(client).status_code == 200

    response = client.get("/api/v1/budgets/monthly/2026/7?currency=VND")

    assert response.status_code == 200
    assert response.json() == {
        "year": 2026,
        "month": 7,
        "currency": "VND",
        "total_budget_minor": 5_000_000,
        "category_budgets": [
            {"category_slug": "food", "budget_minor": 2_000_000},
            {"category_slug": "transport", "budget_minor": 800_000},
        ],
    }


def test_update_monthly_budget_replaces_total_and_category_list(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    assert put_budget(client).status_code == 200

    response = put_budget(
        client,
        {
            "currency": "vnd",
            "total_budget_minor": 6_000_000,
            "category_budgets": [
                {"category_slug": "coffee", "budget_minor": 500_000},
            ],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "year": 2026,
        "month": 7,
        "currency": "VND",
        "total_budget_minor": 6_000_000,
        "category_budgets": [
            {"category_slug": "coffee", "budget_minor": 500_000},
        ],
    }
    assert asyncio.run(count_budget_periods(session_factory)) == 1
    assert asyncio.run(count_category_budgets(session_factory)) == 1


def test_empty_category_budget_list_is_valid(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = put_budget(
        client,
        {
            "currency": "VND",
            "total_budget_minor": 0,
            "category_budgets": [],
        },
    )

    assert response.status_code == 200
    assert response.json()["category_budgets"] == []


def test_missing_budget_returns_404(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/budgets/monthly/2026/7?currency=VND")

    assert response.status_code == 404
    assert response.json()["detail"] == "monthly budget setup was not found"


def test_invalid_month_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.put(
        "/api/v1/budgets/monthly/2026/13",
        json=DEFAULT_BUDGET_PAYLOAD,
    )

    assert response.status_code == 422


def test_invalid_currency_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = put_budget(client, {**DEFAULT_BUDGET_PAYLOAD, "currency": "USD"})

    assert response.status_code == 422
    assert response.json()["detail"] == "unsupported currency: USD"


def test_float_string_and_negative_total_budget_are_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    for amount in (500.5, "500000", -1):
        response = put_budget(
            client,
            {**DEFAULT_BUDGET_PAYLOAD, "total_budget_minor": amount},
        )
        assert response.status_code == 422


def test_float_string_and_negative_category_budget_are_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    for amount in (10.5, "10000", -1):
        payload = {
            **DEFAULT_BUDGET_PAYLOAD,
            "category_budgets": [{"category_slug": "food", "budget_minor": amount}],
        }
        response = put_budget(client, payload)
        assert response.status_code == 422


def test_income_unknown_and_duplicate_categories_are_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    invalid_payloads = [
        {
            **DEFAULT_BUDGET_PAYLOAD,
            "category_budgets": [
                {"category_slug": "salary", "budget_minor": 500_000},
            ],
        },
        {
            **DEFAULT_BUDGET_PAYLOAD,
            "category_budgets": [
                {"category_slug": "not-a-category", "budget_minor": 500_000},
            ],
        },
        {
            **DEFAULT_BUDGET_PAYLOAD,
            "category_budgets": [
                {"category_slug": "food", "budget_minor": 500_000},
                {"category_slug": "FOOD", "budget_minor": 500_000},
            ],
        },
    ]

    for payload in invalid_payloads:
        response = put_budget(client, payload)
        assert response.status_code == 422


def test_category_budget_sum_exceeding_total_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = put_budget(
        client,
        {
            "currency": "VND",
            "total_budget_minor": 100_000,
            "category_budgets": [
                {"category_slug": "food", "budget_minor": 80_000},
                {"category_slug": "coffee", "budget_minor": 30_000},
            ],
        },
    )

    assert response.status_code == 422
    assert (
        response.json()["detail"] == "category budget total cannot exceed total budget"
    )


def test_failed_update_does_not_partially_mutate_existing_budget_setup(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    assert put_budget(client).status_code == 200

    response = put_budget(
        client,
        {
            "currency": "VND",
            "total_budget_minor": 6_000_000,
            "category_budgets": [
                {"category_slug": "salary", "budget_minor": 1_000_000},
            ],
        },
    )

    assert response.status_code == 422
    saved = client.get("/api/v1/budgets/monthly/2026/7?currency=VND")
    assert saved.status_code == 200
    assert saved.json()["total_budget_minor"] == 5_000_000
    assert saved.json()["category_budgets"] == [
        {"category_slug": "food", "budget_minor": 2_000_000},
        {"category_slug": "transport", "budget_minor": 800_000},
    ]
    assert asyncio.run(count_budget_periods(session_factory)) == 1
    assert asyncio.run(count_category_budgets(session_factory)) == 2


def test_budget_setup_does_not_change_transactions_or_account_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="90000000-0000-0000-0000-000000000001",
            transaction_type="expense",
            amount_minor=35_000,
            category_slug="food",
            description="ăn trưa",
            occurred_at=datetime(2026, 7, 11, 12, 0, tzinfo=UTC),
        )
    )
    before_balance = asyncio.run(fetch_account(session_factory)).current_balance_minor
    before_transactions = asyncio.run(count_transactions(session_factory))

    response = put_budget(client)

    assert response.status_code == 200
    assert asyncio.run(count_transactions(session_factory)) == before_transactions
    after_balance = asyncio.run(fetch_account(session_factory)).current_balance_minor
    assert after_balance == before_balance


def test_health_remains_independent(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
