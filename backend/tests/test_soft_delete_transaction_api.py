import asyncio
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.factory import get_llm_provider
from app.api.routes.ai import get_current_time
from app.api.routes.transactions import get_delete_time
from app.application import transactions as transaction_app
from app.application.transactions import (
    SoftDeleteTransactionCommand,
    soft_delete_transaction,
)
from app.db.models import (
    AiTransactionDraftModel,
    BudgetPeriodModel,
    CategoryBudgetModel,
    TransactionModel,
)
from tests.conftest import (
    count_ai_transaction_drafts,
    count_transactions,
    fetch_account,
    fetch_ai_transaction_draft,
    fetch_transaction,
    seed_cash_account,
    seed_transaction,
)

DELETE_AT = datetime(2026, 7, 17, 8, 30, tzinfo=UTC)
QUERY_NOW = datetime(2026, 7, 17, 2, 0, tzinfo=UTC)


def override_delete_time(client: TestClient) -> None:
    client.app.dependency_overrides[get_delete_time] = lambda: DELETE_AT


def override_query_now(client: TestClient) -> None:
    client.app.dependency_overrides[get_current_time] = lambda: QUERY_NOW


def create_manual_transaction(
    client: TestClient,
    *,
    transaction_type: str,
    amount_minor: int,
    category_slug: str,
    description: str,
):
    return client.post(
        "/api/v1/transactions",
        json={
            "type": transaction_type,
            "amount_minor": amount_minor,
            "currency": "VND",
            "category_slug": category_slug,
            "description": description,
            "occurred_at": "2026-07-15T12:00:00+00:00",
            "source": "manual",
        },
    )


async def fetch_transaction_by_id(
    session_factory: async_sessionmaker[AsyncSession],
    transaction_id: str,
) -> TransactionModel:
    async with session_factory() as session:
        result = await session.execute(
            select(TransactionModel).where(TransactionModel.id == transaction_id)
        )
        return result.scalar_one()


async def fetch_transaction_ids(
    session_factory: async_sessionmaker[AsyncSession],
) -> list[str]:
    async with session_factory() as session:
        result = await session.execute(
            select(TransactionModel.id).order_by(TransactionModel.id)
        )
        return [str(transaction_id) for transaction_id in result.scalars().all()]


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


async def seed_ai_chat_transaction_with_draft(
    session_factory: async_sessionmaker[AsyncSession],
) -> tuple[str, str]:
    await seed_cash_account(session_factory, balance_minor=965_000)
    transaction_id = "99000000-0000-0000-0000-000000000001"
    await seed_transaction(
        session_factory,
        transaction_id=transaction_id,
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa bằng AI",
        occurred_at=datetime(2026, 7, 15, 12, 0, tzinfo=UTC),
        created_at=datetime(2026, 7, 15, 12, 1, tzinfo=UTC),
        source="ai_chat",
    )
    async with session_factory() as session:
        async with session.begin():
            draft = AiTransactionDraftModel(
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
                missing_fields_json="[]",
                raw_user_text="Hôm nay tôi tiêu 35k vào ăn trưa",
                provider_name="fake",
                model_name="fake-structured-parser",
                status="confirmed",
                created_transaction_id=transaction_id,
                expires_at=DELETE_AT + timedelta(minutes=15),
                confirmed_at=DELETE_AT - timedelta(minutes=1),
            )
            session.add(draft)
            await session.flush()
            return transaction_id, draft.id


async def seed_failed_delete_fixture(
    session_factory: async_sessionmaker[AsyncSession],
) -> str:
    await seed_cash_account(session_factory, balance_minor=965_000)
    transaction_id = "99000000-0000-0000-0000-000000000002"
    await seed_transaction(
        session_factory,
        transaction_id=transaction_id,
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="rollback expense",
        occurred_at=datetime(2026, 7, 15, 12, 0, tzinfo=UTC),
    )
    return transaction_id


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


def test_delete_active_expense_marks_row_and_reverses_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_delete_time(client)
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    create_response = create_manual_transaction(
        client,
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
    )
    transaction_id = create_response.json()["id"]

    response = client.delete(f"/api/v1/transactions/{transaction_id}")

    assert response.status_code == 200
    assert response.json() == {
        "id": transaction_id,
        "deleted": True,
        "deleted_at": "2026-07-17T08:30:00Z",
        "account_balance_minor": 1_000_000,
    }
    assert asyncio.run(count_transactions(session_factory)) == 1
    transaction = asyncio.run(fetch_transaction(session_factory))
    assert transaction.deleted_at is not None
    assert transaction.amount_minor == 35_000
    assert transaction.category_slug == "food"
    assert transaction.description == "ăn trưa"
    assert transaction.source == "manual"
    assert asyncio.run(fetch_account(session_factory)).current_balance_minor == (
        1_000_000
    )


def test_delete_active_income_marks_row_and_reverses_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_delete_time(client)
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    create_response = create_manual_transaction(
        client,
        transaction_type="income",
        amount_minor=2_000_000,
        category_slug="salary",
        description="lương",
    )
    transaction_id = create_response.json()["id"]

    response = client.delete(f"/api/v1/transactions/{transaction_id}")

    assert response.status_code == 200
    assert response.json()["account_balance_minor"] == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 1
    transaction = asyncio.run(fetch_transaction(session_factory))
    assert transaction.deleted_at is not None
    assert transaction.type == "income"
    assert asyncio.run(fetch_account(session_factory)).current_balance_minor == (
        1_000_000
    )


def test_delete_ai_chat_transaction_keeps_ai_draft_reference(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_delete_time(client)
    transaction_id, draft_id = asyncio.run(
        seed_ai_chat_transaction_with_draft(session_factory)
    )
    before_draft = asyncio.run(fetch_ai_transaction_draft(session_factory, draft_id))

    response = client.delete(f"/api/v1/transactions/{transaction_id}")

    assert response.status_code == 200
    transaction = asyncio.run(fetch_transaction_by_id(session_factory, transaction_id))
    assert transaction.deleted_at is not None
    assert transaction.source == "ai_chat"
    after_draft = asyncio.run(fetch_ai_transaction_draft(session_factory, draft_id))
    assert after_draft.id == before_draft.id
    assert after_draft.status == "confirmed"
    assert after_draft.created_transaction_id == transaction_id
    assert after_draft.raw_user_text == before_draft.raw_user_text


def test_delete_unknown_invalid_and_already_deleted_transactions(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_delete_time(client)
    unknown = "99000000-0000-0000-0000-000000000404"

    unknown_response = client.delete(f"/api/v1/transactions/{unknown}")
    invalid_response = client.delete("/api/v1/transactions/not-a-uuid")

    assert unknown_response.status_code == 404
    assert unknown_response.json() == {"detail": "transaction not found"}
    assert invalid_response.status_code == 422


def test_repeated_delete_does_not_reverse_balance_twice(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_delete_time(client)
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    create_response = create_manual_transaction(
        client,
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
    )
    transaction_id = create_response.json()["id"]

    first = client.delete(f"/api/v1/transactions/{transaction_id}")
    second = client.delete(f"/api/v1/transactions/{transaction_id}")

    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json() == {"detail": "transaction is already deleted"}
    assert asyncio.run(fetch_account(session_factory)).current_balance_minor == (
        1_000_000
    )


def test_failed_delete_rolls_back_balance_and_deleted_at(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    monkeypatch,
) -> None:  # type: ignore[no-untyped-def]
    _client, session_factory = transaction_api_client
    transaction_id = asyncio.run(seed_failed_delete_fixture(session_factory))

    async def fail_mark_deleted(
        session: AsyncSession,
        transaction: TransactionModel,
        *,
        deleted_at: datetime,
    ) -> None:
        raise RuntimeError("simulated delete failure")

    monkeypatch.setattr(transaction_app, "mark_transaction_deleted", fail_mark_deleted)

    async def attempt_delete() -> None:
        async with session_factory() as session:
            await soft_delete_transaction(
                session,
                SoftDeleteTransactionCommand(
                    transaction_id=transaction_id,
                    deleted_at=DELETE_AT,
                ),
            )

    try:
        asyncio.run(attempt_delete())
    except RuntimeError as error:
        assert str(error) == "simulated delete failure"
    else:
        raise AssertionError("expected simulated delete failure")

    transaction = asyncio.run(fetch_transaction_by_id(session_factory, transaction_id))
    assert transaction.deleted_at is None
    assert asyncio.run(fetch_account(session_factory)).current_balance_minor == 965_000


def test_deleted_transaction_is_excluded_from_reads_insights_and_exports(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_delete_time(client)
    override_query_now(client)
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    put_food_budget(client)
    create_response = create_manual_transaction(
        client,
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
    )
    transaction_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/v1/transactions/{transaction_id}")

    assert delete_response.status_code == 200
    assert client.get("/api/v1/transactions").json()["items"] == []
    assert client.get("/api/v1/transactions?month=2026-07").json()["items"] == []
    assert client.get("/api/v1/transactions?category=food").json()["items"] == []
    assert client.get("/api/v1/transactions?type=expense").json()["items"] == []
    assert client.get("/api/v1/transactions?q=trưa").json()["items"] == []
    dashboard = client.get("/api/v1/dashboard/summary?month=2026-07").json()
    assert dashboard["total_balance_minor"] == 1_000_000
    assert dashboard["monthly_expense_minor"] == 0
    assert dashboard["category_breakdown"] == []
    budget = client.get("/api/v1/budgets/monthly/2026/7/remaining").json()
    assert budget["categories"][0]["spent_minor"] == 0
    assert budget["categories"][0]["remaining_minor"] == 100_000
    spending = client.post(
        "/api/v1/ai/query-spending",
        json={"message": "Tháng này tôi ăn uống hết bao nhiêu?"},
    ).json()
    assert spending["amount_minor"] == 0
    budget_intent = client.post(
        "/api/v1/ai/query-budget-remaining",
        json={"message": "Còn bao nhiêu tiền ăn tháng này?"},
    ).json()
    assert budget_intent["spent_minor"] == 0
    assert budget_intent["remaining_minor"] == 100_000
    breakdown = client.post(
        "/api/v1/ai/query-spending-breakdown",
        json={"message": "Tuần này tôi tiêu nhiều nhất vào mục nào?"},
    ).json()
    assert breakdown["total_expense_minor"] == 0
    assert breakdown["breakdown"] == []
    csv_export = client.get("/api/v1/transactions/export?format=csv")
    json_export = client.get("/api/v1/transactions/export?format=json").json()
    assert transaction_id not in csv_export.text
    assert json_export["transactions"] == []
    assert asyncio.run(fetch_transaction_ids(session_factory)) == [transaction_id]


def test_delete_does_not_mutate_budgets_or_call_llm_provider(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_delete_time(client)
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    put_food_budget(client)
    create_response = create_manual_transaction(
        client,
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
    )
    transaction_id = create_response.json()["id"]
    before_budget_count = asyncio.run(count_budget_periods(session_factory))
    before_category_budget_count = asyncio.run(count_category_budgets(session_factory))
    before_draft_count = asyncio.run(count_ai_transaction_drafts(session_factory))

    def forbidden_provider() -> object:
        raise AssertionError("delete must not resolve an LLM provider")

    client.app.dependency_overrides[get_llm_provider] = forbidden_provider

    response = client.delete(f"/api/v1/transactions/{transaction_id}")

    assert response.status_code == 200
    assert asyncio.run(count_budget_periods(session_factory)) == before_budget_count
    assert asyncio.run(count_category_budgets(session_factory)) == (
        before_category_budget_count
    )
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == (
        before_draft_count
    )
