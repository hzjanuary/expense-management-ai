import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.errors import (
    LlmProviderError,
    LlmProviderInvalidResponseError,
    LlmProviderTimeoutError,
    LlmProviderUnavailableError,
)
from app.ai.factory import get_llm_provider
from app.ai.schemas import (
    Confidence,
    LlmProviderStatus,
    SupportedIntent,
    TransactionParseRequest,
    TransactionParseResult,
)
from app.api.routes.ai import get_current_time
from app.db.models import BudgetPeriodModel, CategoryBudgetModel, TransactionModel
from tests.conftest import (
    count_ai_transaction_drafts,
    count_transactions,
    fetch_account,
    seed_cash_account,
    seed_transaction,
)

QUERY_NOW = datetime(2026, 7, 15, 3, 0, tzinfo=UTC)


@dataclass(frozen=True, slots=True)
class StaticBudgetProvider:
    result: TransactionParseResult | None = None
    error: Exception | None = None

    async def parse_transaction_text(
        self,
        request: TransactionParseRequest,
    ) -> TransactionParseResult:
        if self.error is not None:
            raise self.error
        if self.result is None:
            raise AssertionError("test provider needs result or error")
        return self.result

    async def get_status(self) -> LlmProviderStatus:
        return LlmProviderStatus(
            provider_name="static",
            model_name="static-budget",
            available=self.error is None,
            reason=None,
        )


def override_now(client: TestClient) -> None:
    client.app.dependency_overrides[get_current_time] = lambda: QUERY_NOW


def override_provider(client: TestClient, provider: StaticBudgetProvider) -> None:
    client.app.dependency_overrides[get_llm_provider] = lambda: provider


def query_budget_remaining(
    client: TestClient,
    message: str = "Còn bao nhiêu tiền ăn tháng này?",
    **extra: object,
):
    payload: dict[str, object] = {"message": message}
    payload.update(extra)
    return client.post("/api/v1/ai/query-budget-remaining", json=payload)


def budget_result(**overrides: object) -> TransactionParseResult:
    payload: dict[str, object] = {
        "intent": SupportedIntent.BUDGET_REMAINING,
        "transaction_type": None,
        "amount_minor": None,
        "currency": "VND",
        "category_slug": "food",
        "description": None,
        "merchant": None,
        "occurred_at_text": None,
        "occurred_at_iso": None,
        "date_range_label": "this_month",
        "needs_confirmation": False,
        "confidence": Confidence.HIGH,
        "missing_fields": [],
    }
    payload.update(overrides)
    return TransactionParseResult.model_validate(payload)


def put_food_budget(client: TestClient, *, food_budget_minor: int = 2_000_000) -> None:
    response = client.put(
        "/api/v1/budgets/monthly/2026/7",
        json={
            "currency": "VND",
            "total_budget_minor": max(food_budget_minor, 1_000_000),
            "category_budgets": [
                {"category_slug": "food", "budget_minor": food_budget_minor}
            ],
        },
    )
    assert response.status_code == 200


async def seed_budget_remaining_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory, balance_minor=1_000_000)
    await seed_transaction(
        session_factory,
        transaction_id="96000000-0000-0000-0000-000000000001",
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
        occurred_at=datetime(2026, 7, 11, 12, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="96000000-0000-0000-0000-000000000002",
        transaction_type="income",
        amount_minor=1_000_000,
        category_slug="food",
        description="not spending",
        occurred_at=datetime(2026, 7, 12, 9, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="96000000-0000-0000-0000-000000000003",
        transaction_type="expense",
        amount_minor=80_000,
        category_slug="transport",
        description="taxi",
        occurred_at=datetime(2026, 7, 13, 9, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="96000000-0000-0000-0000-000000000004",
        transaction_type="expense",
        amount_minor=500_000,
        category_slug="food",
        description="outside month",
        occurred_at=datetime(2026, 8, 1, 1, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="96000000-0000-0000-0000-000000000005",
        transaction_type="expense",
        amount_minor=70_000,
        category_slug="food",
        description="deleted food",
        occurred_at=datetime(2026, 7, 14, 18, 0, tzinfo=UTC),
        deleted_at=datetime(2026, 7, 15, 18, 0, tzinfo=UTC),
    )


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


async def fetch_transaction_amounts(
    session_factory: async_sessionmaker[AsyncSession],
) -> list[int]:
    async with session_factory() as session:
        result = await session.execute(
            select(TransactionModel.amount_minor).order_by(TransactionModel.id)
        )
        return [int(amount) for amount in result.scalars().all()]


async def fetch_category_budget_amounts(
    session_factory: async_sessionmaker[AsyncSession],
) -> list[int]:
    async with session_factory() as session:
        result = await session.execute(
            select(CategoryBudgetModel.budget_minor).order_by(CategoryBudgetModel.id)
        )
        return [int(amount) for amount in result.scalars().all()]


def test_budget_remaining_returns_configured_food_budget_and_db_spend(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    put_food_budget(client)
    asyncio.run(seed_budget_remaining_transactions(session_factory))

    response = query_budget_remaining(client)

    assert response.status_code == 200
    assert response.json() == {
        "intent": "budget_remaining",
        "category_slug": "food",
        "currency": "VND",
        "date_range": {
            "start": "2026-06-30T17:00:00Z",
            "end": "2026-07-31T17:00:00Z",
            "label": "this_month",
        },
        "budget_minor": 2_000_000,
        "spent_minor": 35_000,
        "remaining_minor": 1_965_000,
        "is_over_budget": False,
        "transaction_count": 1,
        "answer": "Tháng này bạn còn 1.965.000₫ cho Ăn uống.",
        "needs_clarification": False,
        "clarification": None,
    }


@pytest.mark.parametrize(
    "message",
    [
        "Tháng này còn bao nhiêu ngân sách ăn uống?",
        "Còn bao nhiêu budget food tháng này?",
        "Còn bao nhiêu tiền ăn ngoài tháng này?",
    ],
)
def test_budget_remaining_supports_food_query_variants(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    message: str,
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    put_food_budget(client)
    asyncio.run(seed_budget_remaining_transactions(session_factory))

    response = query_budget_remaining(client, message)

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "budget_remaining"
    assert payload["category_slug"] == "food"
    assert payload["remaining_minor"] == 1_965_000


def test_budget_remaining_over_budget_state_is_computed(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    put_food_budget(client, food_budget_minor=20_000)
    asyncio.run(seed_budget_remaining_transactions(session_factory))

    response = query_budget_remaining(client)

    assert response.status_code == 200
    payload = response.json()
    assert payload["budget_minor"] == 20_000
    assert payload["spent_minor"] == 35_000
    assert payload["remaining_minor"] == -15_000
    assert payload["is_over_budget"] is True
    assert payload["answer"] == "Tháng này bạn còn -15.000₫ cho Ăn uống."


def test_budget_remaining_empty_spending_returns_full_remaining_budget(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    put_food_budget(client)

    response = query_budget_remaining(client)

    assert response.status_code == 200
    payload = response.json()
    assert payload["spent_minor"] == 0
    assert payload["transaction_count"] == 0
    assert payload["remaining_minor"] == 2_000_000
    assert payload["is_over_budget"] is False


def test_budget_remaining_missing_budget_returns_no_budget_response(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_budget_remaining_transactions(session_factory))

    response = query_budget_remaining(client)

    assert response.status_code == 200
    assert response.json() == {
        "intent": "budget_remaining",
        "category_slug": "food",
        "currency": "VND",
        "date_range": {
            "start": "2026-06-30T17:00:00Z",
            "end": "2026-07-31T17:00:00Z",
            "label": "this_month",
        },
        "budget_minor": None,
        "spent_minor": 35_000,
        "remaining_minor": None,
        "is_over_budget": None,
        "transaction_count": 1,
        "answer": "Bạn chưa thiết lập ngân sách cho Ăn uống tháng này.",
        "needs_clarification": False,
        "clarification": None,
    }


def test_budget_remaining_missing_category_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)

    response = query_budget_remaining(client, "Còn bao nhiêu tháng này?")

    assert response.status_code == 200
    assert response.json() == {
        "intent": "budget_remaining",
        "category_slug": None,
        "currency": "VND",
        "date_range": None,
        "budget_minor": None,
        "spent_minor": None,
        "remaining_minor": None,
        "is_over_budget": None,
        "transaction_count": 0,
        "answer": None,
        "needs_clarification": True,
        "clarification": {
            "message": "Bạn muốn hỏi ngân sách còn lại cho danh mục nào?",
            "fields": ["category_slug"],
        },
    }
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_budget_remaining_invalid_category_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(
        client, StaticBudgetProvider(result=budget_result(category_slug="salary"))
    )

    response = query_budget_remaining(client)

    assert response.status_code == 200
    assert response.json()["needs_clarification"] is True
    assert response.json()["clarification"] == {
        "message": "Bạn muốn hỏi ngân sách còn lại cho danh mục nào?",
        "fields": ["category_slug"],
    }


def test_budget_remaining_unsupported_date_range_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(
        client,
        StaticBudgetProvider(result=budget_result(date_range_label="last_month")),
    )

    response = query_budget_remaining(client)

    assert response.status_code == 200
    assert response.json()["needs_clarification"] is True
    assert response.json()["clarification"] == {
        "message": "Bạn muốn xem ngân sách còn lại trong khoảng thời gian nào?",
        "fields": ["date_range"],
    }


def test_budget_remaining_unknown_intent_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(
        client,
        StaticBudgetProvider(
            result=TransactionParseResult(
                intent=SupportedIntent.UNKNOWN,
                needs_confirmation=True,
                confidence=Confidence.LOW,
                missing_fields=["intent"],
            )
        ),
    )

    response = query_budget_remaining(client)

    assert response.status_code == 200
    assert response.json()["intent"] == "unknown"
    assert response.json()["needs_clarification"] is True
    assert response.json()["clarification"] == {
        "message": (
            "Mình chưa hiểu câu hỏi ngân sách này. "
            "Bạn có thể hỏi theo danh mục và thời gian rõ hơn không?"
        ),
        "fields": ["intent"],
    }


def test_budget_remaining_rejects_empty_message(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = query_budget_remaining(client, "   ")

    assert response.status_code == 422


def test_budget_remaining_rejects_invalid_currency(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = query_budget_remaining(client, currency="USD")

    assert response.status_code == 422


def test_budget_remaining_rejects_invalid_timezone(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)

    response = query_budget_remaining(client, timezone="No/Such_Zone")

    assert response.status_code == 422
    assert response.json()["detail"] == "timezone is invalid"


@pytest.mark.parametrize(
    ("error", "expected_status", "expected_detail"),
    [
        (LlmProviderUnavailableError(), 503, "LLM provider is unavailable"),
        (LlmProviderTimeoutError(), 504, "LLM provider timed out"),
        (
            LlmProviderInvalidResponseError(),
            502,
            "LLM provider returned invalid structured output",
        ),
        (LlmProviderError(), 502, "LLM provider error"),
    ],
)
def test_budget_remaining_maps_provider_errors_to_safe_api_errors(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    error: Exception,
    expected_status: int,
    expected_detail: str,
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(client, StaticBudgetProvider(error=error))

    response = query_budget_remaining(client)

    assert response.status_code == expected_status
    assert response.json()["detail"] == expected_detail


def test_budget_remaining_is_read_only_for_ledger_budget_and_ai_state(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    put_food_budget(client)
    asyncio.run(seed_budget_remaining_transactions(session_factory))
    before_account = asyncio.run(fetch_account(session_factory))
    before_balance = before_account.current_balance_minor
    before_transactions = asyncio.run(count_transactions(session_factory))
    before_amounts = asyncio.run(fetch_transaction_amounts(session_factory))
    before_drafts = asyncio.run(count_ai_transaction_drafts(session_factory))
    before_budget_periods = asyncio.run(count_budget_periods(session_factory))
    before_category_budgets = asyncio.run(count_category_budgets(session_factory))
    before_budget_amounts = asyncio.run(fetch_category_budget_amounts(session_factory))

    response = query_budget_remaining(client)

    assert response.status_code == 200
    after_account = asyncio.run(fetch_account(session_factory))
    assert after_account.current_balance_minor == before_balance
    assert asyncio.run(count_transactions(session_factory)) == before_transactions
    assert asyncio.run(fetch_transaction_amounts(session_factory)) == before_amounts
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == before_drafts
    assert asyncio.run(count_budget_periods(session_factory)) == before_budget_periods
    assert (
        asyncio.run(count_category_budgets(session_factory)) == before_category_budgets
    )
    assert (
        asyncio.run(fetch_category_budget_amounts(session_factory))
        == before_budget_amounts
    )
