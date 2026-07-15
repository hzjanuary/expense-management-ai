import asyncio
from datetime import UTC, datetime
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import BudgetPeriodModel, CategoryBudgetModel
from tests.conftest import (
    count_ai_transaction_drafts,
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
        {"category_slug": "coffee", "budget_minor": 45_000},
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


def put_budget(client: TestClient, payload: dict[str, Any] | None = None) -> None:
    response = client.put(
        "/api/v1/budgets/monthly/2026/7",
        json=payload or DEFAULT_BUDGET_PAYLOAD,
    )
    assert response.status_code == 200


def get_remaining(client: TestClient):
    return client.get("/api/v1/budgets/monthly/2026/7/remaining?currency=VND")


async def seed_budget_remaining_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory, balance_minor=1_000_000)
    await seed_transaction(
        session_factory,
        transaction_id="80000000-0000-0000-0000-000000000001",
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
        occurred_at=datetime(2026, 7, 11, 12, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="80000000-0000-0000-0000-000000000002",
        transaction_type="expense",
        amount_minor=150_000,
        category_slug="coffee",
        description="coffee beans",
        occurred_at=datetime(2026, 7, 12, 9, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="80000000-0000-0000-0000-000000000003",
        transaction_type="expense",
        amount_minor=10_000,
        category_slug="shopping",
        description="unbudgeted monthly expense",
        occurred_at=datetime(2026, 7, 13, 13, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="80000000-0000-0000-0000-000000000004",
        transaction_type="income",
        amount_minor=9_000_000,
        category_slug="salary",
        description="salary",
        occurred_at=datetime(2026, 7, 14, 8, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="80000000-0000-0000-0000-000000000005",
        transaction_type="expense",
        amount_minor=500_000,
        category_slug="food",
        description="outside month",
        occurred_at=datetime(2026, 6, 30, 12, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="80000000-0000-0000-0000-000000000006",
        transaction_type="expense",
        amount_minor=700_000,
        category_slug="transport",
        description="deleted transport",
        occurred_at=datetime(2026, 7, 15, 12, 0, tzinfo=UTC),
        deleted_at=datetime(2026, 7, 16, 12, 0, tzinfo=UTC),
    )


def test_remaining_endpoint_returns_configured_categories_and_computed_totals(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    put_budget(client)
    asyncio.run(seed_budget_remaining_transactions(session_factory))

    response = get_remaining(client)

    assert response.status_code == 200
    assert response.json() == {
        "year": 2026,
        "month": 7,
        "currency": "VND",
        "total_budget_minor": 5_000_000,
        "total_expense_minor": 195_000,
        "total_remaining_minor": 4_805_000,
        "categories": [
            {
                "category_slug": "coffee",
                "budget_minor": 45_000,
                "spent_minor": 150_000,
                "remaining_minor": -105_000,
                "is_over_budget": True,
            },
            {
                "category_slug": "food",
                "budget_minor": 2_000_000,
                "spent_minor": 35_000,
                "remaining_minor": 1_965_000,
                "is_over_budget": False,
            },
            {
                "category_slug": "transport",
                "budget_minor": 800_000,
                "spent_minor": 0,
                "remaining_minor": 800_000,
                "is_over_budget": False,
            },
        ],
    }


def test_exact_budget_is_not_over_budget(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    put_budget(
        client,
        {
            "currency": "VND",
            "total_budget_minor": 100_000,
            "category_budgets": [{"category_slug": "food", "budget_minor": 35_000}],
        },
    )
    asyncio.run(seed_cash_account(session_factory))
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="80000000-0000-0000-0000-000000000007",
            transaction_type="expense",
            amount_minor=35_000,
            category_slug="food",
            description="exact food budget",
            occurred_at=datetime(2026, 7, 11, 12, 0, tzinfo=UTC),
        )
    )

    response = get_remaining(client)

    assert response.status_code == 200
    category = response.json()["categories"][0]
    assert category["spent_minor"] == 35_000
    assert category["remaining_minor"] == 0
    assert category["is_over_budget"] is False


def test_empty_spending_month_returns_full_remaining_budget(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    put_budget(client)

    response = get_remaining(client)

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_expense_minor"] == 0
    assert payload["total_remaining_minor"] == 5_000_000
    assert payload["categories"] == [
        {
            "category_slug": "coffee",
            "budget_minor": 45_000,
            "spent_minor": 0,
            "remaining_minor": 45_000,
            "is_over_budget": False,
        },
        {
            "category_slug": "food",
            "budget_minor": 2_000_000,
            "spent_minor": 0,
            "remaining_minor": 2_000_000,
            "is_over_budget": False,
        },
        {
            "category_slug": "transport",
            "budget_minor": 800_000,
            "spent_minor": 0,
            "remaining_minor": 800_000,
            "is_over_budget": False,
        },
    ]


def test_missing_budget_setup_returns_404(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = get_remaining(client)

    assert response.status_code == 404
    assert response.json()["detail"] == "monthly budget setup was not found"


def test_invalid_month_and_currency_are_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    put_budget(client)

    invalid_month = client.get("/api/v1/budgets/monthly/2026/13/remaining?currency=VND")
    invalid_currency = client.get(
        "/api/v1/budgets/monthly/2026/7/remaining?currency=USD"
    )

    assert invalid_month.status_code == 422
    assert invalid_currency.status_code == 422
    assert invalid_currency.json()["detail"] == "unsupported currency: USD"


def test_remaining_endpoint_is_read_only(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    put_budget(client)
    asyncio.run(seed_budget_remaining_transactions(session_factory))
    before_budget_periods = asyncio.run(count_budget_periods(session_factory))
    before_category_budgets = asyncio.run(count_category_budgets(session_factory))
    before_transactions = asyncio.run(count_transactions(session_factory))
    before_ai_drafts = asyncio.run(count_ai_transaction_drafts(session_factory))
    before_balance = asyncio.run(fetch_account(session_factory)).current_balance_minor

    response = get_remaining(client)

    assert response.status_code == 200
    assert asyncio.run(count_budget_periods(session_factory)) == before_budget_periods
    assert (
        asyncio.run(count_category_budgets(session_factory)) == before_category_budgets
    )
    assert asyncio.run(count_transactions(session_factory)) == before_transactions
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == before_ai_drafts
    after_balance = asyncio.run(fetch_account(session_factory)).current_balance_minor
    assert after_balance == before_balance
