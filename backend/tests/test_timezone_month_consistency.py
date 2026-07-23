import asyncio
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.routes.ai import get_current_time
from tests.conftest import seed_cash_account, seed_transaction

NOW = datetime(2026, 7, 15, 3, 0, tzinfo=UTC)


async def seed_boundary_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory, balance_minor=1_000_000)
    for transaction_id, amount, occurred_at in (
        (
            "97000000-0000-0000-0000-000000000001",
            999,
            datetime(2026, 6, 30, 16, 59, tzinfo=UTC),
        ),
        (
            "97000000-0000-0000-0000-000000000002",
            100,
            datetime(2026, 6, 30, 17, 0, tzinfo=UTC),
        ),
        (
            "97000000-0000-0000-0000-000000000003",
            200,
            datetime(2026, 6, 30, 17, 30, tzinfo=UTC),
        ),
        (
            "97000000-0000-0000-0000-000000000004",
            300,
            datetime(2026, 7, 31, 16, 59, tzinfo=UTC),
        ),
        (
            "97000000-0000-0000-0000-000000000005",
            888,
            datetime(2026, 7, 31, 17, 0, tzinfo=UTC),
        ),
    ):
        await seed_transaction(
            session_factory,
            transaction_id=transaction_id,
            transaction_type="expense",
            amount_minor=amount,
            category_slug="food",
            description=f"boundary {amount}",
            occurred_at=occurred_at,
            created_at=occurred_at,
        )


def included_ids(payload: dict[str, object]) -> set[str]:
    items = payload["items"]
    assert isinstance(items, list)
    return {str(item["id"]) for item in items}


def test_month_boundary_is_consistent_across_financial_features(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    client.app.dependency_overrides[get_current_time] = lambda: NOW
    asyncio.run(seed_boundary_transactions(session_factory))

    budget_response = client.put(
        "/api/v1/budgets/monthly/2026/7",
        json={
            "currency": "VND",
            "total_budget_minor": 1_000,
            "category_budgets": [{"category_slug": "food", "budget_minor": 1_000}],
        },
    )
    assert budget_response.status_code == 200

    dashboard = client.get("/api/v1/dashboard/summary?month=2026-07")
    listing = client.get("/api/v1/transactions?month=2026-07&limit=100")
    export = client.get("/api/v1/transactions/export?format=json&month=2026-07")
    remaining = client.get("/api/v1/budgets/monthly/2026/7/remaining?currency=VND")
    ai_total = client.post(
        "/api/v1/ai/query-spending",
        json={"message": "Tháng này tôi đã chi tổng cộng bao nhiêu?"},
    )

    assert dashboard.status_code == 200
    assert listing.status_code == 200
    assert export.status_code == 200
    assert remaining.status_code == 200
    assert ai_total.status_code == 200

    expected_ids = {
        "97000000-0000-0000-0000-000000000002",
        "97000000-0000-0000-0000-000000000003",
        "97000000-0000-0000-0000-000000000004",
    }
    assert included_ids(listing.json()) == expected_ids
    assert {item["id"] for item in export.json()["transactions"]} == expected_ids
    assert dashboard.json()["monthly_expense_minor"] == 600
    assert remaining.json()["total_expense_minor"] == 600
    assert remaining.json()["categories"][0]["spent_minor"] == 600
    assert ai_total.json()["amount_minor"] == 600
    assert ai_total.json()["transaction_count"] == 3
    assert ai_total.json()["date_range"] == {
        "start": "2026-06-30T17:00:00Z",
        "end": "2026-07-31T17:00:00Z",
        "label": "this_month",
    }
