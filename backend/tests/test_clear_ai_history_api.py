import asyncio
import json
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.factory import get_llm_provider
from app.api.routes.ai import get_current_time
from app.application import ai_history as ai_history_app
from app.application.ai_history import clear_ai_history
from app.db.models import (
    AiTransactionDraftModel,
    BudgetPeriodModel,
    CategoryBudgetModel,
    TransactionModel,
)
from app.db.repositories import delete_ai_transaction_drafts
from tests.conftest import (
    count_ai_transaction_drafts,
    count_transactions,
    fetch_account,
    seed_cash_account,
    seed_transaction,
)

QUERY_NOW = datetime(2026, 7, 17, 2, 0, tzinfo=UTC)
ACTIVE_AI_TRANSACTION_ID = "60300000-0000-0000-0000-000000000001"
MANUAL_TRANSACTION_ID = "60300000-0000-0000-0000-000000000002"
SOFT_DELETED_AI_TRANSACTION_ID = "60300000-0000-0000-0000-000000000003"


def override_query_now(client: TestClient) -> None:
    client.app.dependency_overrides[get_current_time] = lambda: QUERY_NOW


async def fetch_transaction_by_id(
    session_factory: async_sessionmaker[AsyncSession],
    transaction_id: str,
) -> TransactionModel:
    async with session_factory() as session:
        result = await session.execute(
            select(TransactionModel).where(TransactionModel.id == transaction_id)
        )
        return result.scalar_one()


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


async def seed_ai_draft(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    draft_id: str,
    status: str,
    created_transaction_id: str | None = None,
    expires_at: datetime | None = None,
) -> None:
    expiration = expires_at or datetime(2026, 7, 17, 8, 0, tzinfo=UTC)
    async with session_factory() as session:
        async with session.begin():
            session.add(
                AiTransactionDraftModel(
                    id=draft_id,
                    intent="create_transaction",
                    transaction_type="expense",
                    amount_minor=35_000,
                    currency="VND",
                    category_slug="food",
                    description="ăn trưa bằng AI",
                    merchant=None,
                    occurred_at=datetime(2026, 7, 15, 12, 0, tzinfo=UTC),
                    occurred_at_text="hôm nay",
                    source="ai_chat",
                    confidence="high",
                    needs_confirmation=False,
                    missing_fields_json=json.dumps([]),
                    raw_user_text="Hôm nay tôi tiêu 35k vào ăn trưa",
                    provider_name="fake",
                    model_name="fake-structured-parser",
                    status=status,
                    created_transaction_id=created_transaction_id,
                    expires_at=expiration,
                    confirmed_at=(
                        datetime(2026, 7, 15, 12, 2, tzinfo=UTC)
                        if status == "confirmed"
                        else None
                    ),
                )
            )


async def seed_clear_history_fixture(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory, balance_minor=965_000)
    await seed_transaction(
        session_factory,
        transaction_id=ACTIVE_AI_TRANSACTION_ID,
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa bằng AI",
        occurred_at=datetime(2026, 7, 15, 12, 0, tzinfo=UTC),
        created_at=datetime(2026, 7, 15, 12, 1, tzinfo=UTC),
        source="ai_chat",
    )
    await seed_transaction(
        session_factory,
        transaction_id=MANUAL_TRANSACTION_ID,
        transaction_type="income",
        amount_minor=100_000,
        category_slug="salary",
        description="lương",
        occurred_at=datetime(2026, 7, 15, 9, 0, tzinfo=UTC),
        created_at=datetime(2026, 7, 15, 9, 1, tzinfo=UTC),
        source="manual",
    )
    await seed_transaction(
        session_factory,
        transaction_id=SOFT_DELETED_AI_TRANSACTION_ID,
        transaction_type="expense",
        amount_minor=20_000,
        category_slug="food",
        description="deleted AI expense",
        occurred_at=datetime(2026, 7, 15, 13, 0, tzinfo=UTC),
        created_at=datetime(2026, 7, 15, 13, 1, tzinfo=UTC),
        source="ai_chat",
        deleted_at=datetime(2026, 7, 16, 1, 0, tzinfo=UTC),
    )
    await seed_ai_draft(
        session_factory,
        draft_id="pending-draft",
        status="pending",
    )
    await seed_ai_draft(
        session_factory,
        draft_id="expired-draft",
        status="expired",
        expires_at=datetime(2026, 7, 16, 8, 0, tzinfo=UTC),
    )
    await seed_ai_draft(
        session_factory,
        draft_id="confirmed-active-draft",
        status="confirmed",
        created_transaction_id=ACTIVE_AI_TRANSACTION_ID,
    )
    await seed_ai_draft(
        session_factory,
        draft_id="confirmed-deleted-draft",
        status="confirmed",
        created_transaction_id=SOFT_DELETED_AI_TRANSACTION_ID,
    )


def put_food_budget(client: TestClient) -> None:
    response = client.put(
        "/api/v1/budgets/monthly/2026/7",
        json={
            "currency": "VND",
            "total_budget_minor": 500_000,
            "category_budgets": [{"category_slug": "food", "budget_minor": 100_000}],
        },
    )
    assert response.status_code == 200


def test_clear_ai_history_deletes_drafts_and_preserves_ledger_records(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_clear_history_fixture(session_factory))
    before_balance = asyncio.run(fetch_account(session_factory)).current_balance_minor

    response = client.delete("/api/v1/ai/history")

    assert response.status_code == 200
    assert response.json() == {
        "deleted_draft_count": 4,
        "preserved_transaction_count": 2,
        "cleared": True,
    }
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 0
    assert asyncio.run(count_transactions(session_factory)) == 3
    assert asyncio.run(fetch_account(session_factory)).current_balance_minor == (
        before_balance
    )
    active_transaction = asyncio.run(
        fetch_transaction_by_id(session_factory, ACTIVE_AI_TRANSACTION_ID)
    )
    assert active_transaction.source == "ai_chat"
    assert active_transaction.description == "ăn trưa bằng AI"
    assert active_transaction.deleted_at is None
    manual_transaction = asyncio.run(
        fetch_transaction_by_id(session_factory, MANUAL_TRANSACTION_ID)
    )
    assert manual_transaction.source == "manual"
    soft_deleted_transaction = asyncio.run(
        fetch_transaction_by_id(session_factory, SOFT_DELETED_AI_TRANSACTION_ID)
    )
    assert soft_deleted_transaction.deleted_at is not None


def test_clear_ai_history_empty_and_repeated_requests_are_idempotent(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    first_response = client.delete("/api/v1/ai/history")
    second_response = client.delete("/api/v1/ai/history")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json() == {
        "deleted_draft_count": 0,
        "preserved_transaction_count": 0,
        "cleared": True,
    }
    assert second_response.json() == first_response.json()


def test_cleared_history_preserves_downstream_reads_insights_and_exports(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_query_now(client)
    asyncio.run(seed_clear_history_fixture(session_factory))
    put_food_budget(client)
    before_budget_count = asyncio.run(count_budget_periods(session_factory))
    before_category_budget_count = asyncio.run(count_category_budgets(session_factory))

    response = client.delete("/api/v1/ai/history")

    assert response.status_code == 200
    transaction_list = client.get("/api/v1/transactions").json()
    listed_ids = {item["id"] for item in transaction_list["items"]}
    assert ACTIVE_AI_TRANSACTION_ID in listed_ids
    assert MANUAL_TRANSACTION_ID in listed_ids
    assert SOFT_DELETED_AI_TRANSACTION_ID not in listed_ids
    dashboard = client.get("/api/v1/dashboard/summary?month=2026-07").json()
    assert dashboard["total_balance_minor"] == 965_000
    assert dashboard["monthly_expense_minor"] == 35_000
    assert dashboard["monthly_income_minor"] == 100_000
    budget = client.get("/api/v1/budgets/monthly/2026/7/remaining").json()
    assert budget["categories"][0]["spent_minor"] == 35_000
    assert budget["categories"][0]["remaining_minor"] == 65_000
    spending = client.post(
        "/api/v1/ai/query-spending",
        json={"message": "Tháng này tôi ăn uống hết bao nhiêu?"},
    ).json()
    assert spending["amount_minor"] == 35_000
    assert spending["transaction_count"] == 1
    budget_intent = client.post(
        "/api/v1/ai/query-budget-remaining",
        json={"message": "Còn bao nhiêu tiền ăn tháng này?"},
    ).json()
    assert budget_intent["spent_minor"] == 35_000
    assert budget_intent["remaining_minor"] == 65_000
    breakdown = client.post(
        "/api/v1/ai/query-spending-breakdown",
        json={"message": "Tuần này tôi tiêu nhiều nhất vào mục nào?"},
    ).json()
    assert breakdown["total_expense_minor"] == 35_000
    assert breakdown["top_category"]["category_slug"] == "food"
    csv_export = client.get("/api/v1/transactions/export?format=csv")
    json_export = client.get("/api/v1/transactions/export?format=json").json()
    assert ACTIVE_AI_TRANSACTION_ID in csv_export.text
    assert "Hôm nay tôi tiêu 35k" not in csv_export.text
    exported_ids = {item["id"] for item in json_export["transactions"]}
    assert ACTIVE_AI_TRANSACTION_ID in exported_ids
    assert SOFT_DELETED_AI_TRANSACTION_ID not in exported_ids
    serialized_export = json.dumps(json_export, ensure_ascii=False)
    assert "raw_user_text" not in serialized_export
    assert "provider_name" not in serialized_export
    assert "fake-structured-parser" not in serialized_export
    assert asyncio.run(count_budget_periods(session_factory)) == before_budget_count
    assert asyncio.run(count_category_budgets(session_factory)) == (
        before_category_budget_count
    )


def test_clear_ai_history_does_not_resolve_llm_provider(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_clear_history_fixture(session_factory))

    def forbidden_provider() -> object:
        raise AssertionError("clear history must not resolve an LLM provider")

    client.app.dependency_overrides[get_llm_provider] = forbidden_provider

    response = client.delete("/api/v1/ai/history")

    assert response.status_code == 200
    assert response.json()["deleted_draft_count"] == 4


def test_failed_clear_rolls_back_all_draft_deletions(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _client, session_factory = transaction_api_client
    asyncio.run(seed_clear_history_fixture(session_factory))

    async def fail_after_delete(session: AsyncSession) -> None:
        await delete_ai_transaction_drafts(session)
        raise RuntimeError("simulated history clear failure")

    monkeypatch.setattr(
        ai_history_app,
        "delete_ai_transaction_drafts",
        fail_after_delete,
    )

    async def attempt_clear() -> None:
        async with session_factory() as session:
            await clear_ai_history(session)

    with pytest.raises(RuntimeError, match="simulated history clear failure"):
        asyncio.run(attempt_clear())

    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 4
    assert asyncio.run(count_transactions(session_factory)) == 3


def test_ai_parse_and_confirm_still_work_after_history_was_cleared(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    assert client.delete("/api/v1/ai/history").status_code == 200

    parse_response = client.post(
        "/api/v1/ai/parse",
        json={"message": "Hôm nay tôi tiêu 35k vào ăn trưa"},
    )
    assert parse_response.status_code == 200
    draft_id = parse_response.json()["draft_id"]
    confirm_response = client.post("/api/v1/ai/confirm", json={"draft_id": draft_id})

    assert confirm_response.status_code == 200
    assert confirm_response.json()["transaction"]["source"] == "ai_chat"
    assert confirm_response.json()["account_balance_minor"] == 965_000
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 1
    assert asyncio.run(count_transactions(session_factory)) == 1
