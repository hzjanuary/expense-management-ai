import asyncio
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.conftest import (
    fetch_account,
    seed_account,
    seed_cash_account,
    seed_transaction,
)


async def seed_dashboard_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory, balance_minor=965_000)
    await seed_transaction(
        session_factory,
        transaction_id="10000000-0000-0000-0000-000000000001",
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
        occurred_at=datetime(2026, 7, 11, 12, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="10000000-0000-0000-0000-000000000002",
        transaction_type="income",
        amount_minor=10_000_000,
        category_slug="salary",
        description="lương tháng 7",
        occurred_at=datetime(2026, 7, 11, 9, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="10000000-0000-0000-0000-000000000003",
        transaction_type="expense",
        amount_minor=45_000,
        category_slug="coffee",
        description="cà phê",
        occurred_at=datetime(2026, 7, 12, 8, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="10000000-0000-0000-0000-000000000004",
        transaction_type="expense",
        amount_minor=99_000,
        category_slug="shopping",
        description="outside selected month",
        occurred_at=datetime(2026, 6, 30, 20, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="10000000-0000-0000-0000-000000000005",
        transaction_type="expense",
        amount_minor=500_000,
        category_slug="rent",
        description="deleted rent",
        occurred_at=datetime(2026, 7, 1, 9, 0, tzinfo=UTC),
        deleted_at=datetime(2026, 7, 2, 9, 0, tzinfo=UTC),
    )


def test_empty_ledger_returns_zero_monthly_totals(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/dashboard/summary?month=2026-07")

    assert response.status_code == 200
    assert response.json() == {
        "currency": "VND",
        "total_balance_minor": 0,
        "monthly_income_minor": 0,
        "monthly_expense_minor": 0,
        "category_breakdown": [],
    }


def test_existing_account_balance_appears_in_dashboard_summary(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=965_000))
    asyncio.run(
        seed_account(
            session_factory,
            name="Savings",
            balance_minor=2_000_000,
        )
    )

    response = client.get("/api/v1/dashboard/summary?month=2026-07")

    assert response.status_code == 200
    assert response.json()["total_balance_minor"] == 2_965_000


def test_dashboard_summary_computes_monthly_income_expense_and_breakdown(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_dashboard_transactions(session_factory))

    response = client.get("/api/v1/dashboard/summary?month=2026-07")

    assert response.status_code == 200
    assert response.json() == {
        "currency": "VND",
        "total_balance_minor": 965_000,
        "monthly_income_minor": 10_000_000,
        "monthly_expense_minor": 80_000,
        "category_breakdown": [
            {"category_slug": "coffee", "type": "expense", "amount_minor": 45_000},
            {"category_slug": "food", "type": "expense", "amount_minor": 35_000},
            {"category_slug": "salary", "type": "income", "amount_minor": 10_000_000},
        ],
    }


def test_transactions_outside_requested_month_are_excluded(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_dashboard_transactions(session_factory))

    response = client.get("/api/v1/dashboard/summary?month=2026-06")

    assert response.status_code == 200
    assert response.json()["monthly_income_minor"] == 0
    assert response.json()["monthly_expense_minor"] == 99_000
    assert response.json()["category_breakdown"] == [
        {"category_slug": "shopping", "type": "expense", "amount_minor": 99_000}
    ]


def test_soft_deleted_transactions_are_excluded_from_dashboard_summary(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_dashboard_transactions(session_factory))

    response = client.get("/api/v1/dashboard/summary?month=2026-07")

    assert response.status_code == 200
    category_slugs = {
        item["category_slug"] for item in response.json()["category_breakdown"]
    }
    assert "rent" not in category_slugs
    assert response.json()["monthly_expense_minor"] == 80_000


def test_invalid_dashboard_month_format_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/dashboard/summary?month=2026-7")

    assert response.status_code == 422
    assert response.json()["detail"] == "month must use YYYY-MM format"


def test_dashboard_summary_requires_month(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 422


def test_dashboard_summary_is_read_only_and_does_not_change_account_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_dashboard_transactions(session_factory))
    before = asyncio.run(fetch_account(session_factory)).current_balance_minor

    response = client.get("/api/v1/dashboard/summary?month=2026-07")

    assert response.status_code == 200
    after = asyncio.run(fetch_account(session_factory)).current_balance_minor
    assert after == before
