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
from app.db.models import BudgetPeriodModel, TransactionModel
from tests.conftest import (
    count_ai_transaction_drafts,
    count_transactions,
    fetch_account,
    seed_cash_account,
    seed_transaction,
)

QUERY_NOW = datetime(2026, 7, 15, 3, 0, tzinfo=UTC)


@dataclass(frozen=True, slots=True)
class StaticQueryProvider:
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
            model_name="static-query",
            available=self.error is None,
            reason=None,
        )


def override_now(client: TestClient) -> None:
    client.app.dependency_overrides[get_current_time] = lambda: QUERY_NOW


def override_provider(client: TestClient, provider: StaticQueryProvider) -> None:
    client.app.dependency_overrides[get_llm_provider] = lambda: provider


def query_spending(
    client: TestClient,
    message: str = "Tháng này tôi ăn uống hết bao nhiêu?",
    **extra: object,
):
    payload: dict[str, object] = {"message": message}
    payload.update(extra)
    return client.post("/api/v1/ai/query-spending", json=payload)


def query_result(**overrides: object) -> TransactionParseResult:
    payload: dict[str, object] = {
        "intent": SupportedIntent.QUERY_SPENDING,
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


async def seed_query_spending_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory, balance_minor=1_000_000)
    await seed_transaction(
        session_factory,
        transaction_id="95000000-0000-0000-0000-000000000001",
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
        occurred_at=datetime(2026, 7, 11, 12, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="95000000-0000-0000-0000-000000000002",
        transaction_type="expense",
        amount_minor=15_000,
        category_slug="food",
        description="bánh mì",
        occurred_at=datetime(2026, 7, 12, 8, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="95000000-0000-0000-0000-000000000003",
        transaction_type="income",
        amount_minor=1_000_000,
        category_slug="food",
        description="not spending",
        occurred_at=datetime(2026, 7, 12, 9, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="95000000-0000-0000-0000-000000000004",
        transaction_type="expense",
        amount_minor=80_000,
        category_slug="transport",
        description="taxi",
        occurred_at=datetime(2026, 7, 13, 9, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="95000000-0000-0000-0000-000000000005",
        transaction_type="expense",
        amount_minor=500_000,
        category_slug="food",
        description="outside month",
        occurred_at=datetime(2026, 8, 1, 1, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="95000000-0000-0000-0000-000000000006",
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


async def fetch_transaction_amounts(
    session_factory: async_sessionmaker[AsyncSession],
) -> list[int]:
    async with session_factory() as session:
        result = await session.execute(
            select(TransactionModel.amount_minor).order_by(TransactionModel.id)
        )
        return [int(amount) for amount in result.scalars().all()]


def test_query_spending_uses_fake_provider_and_returns_db_total(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_query_spending_transactions(session_factory))

    response = query_spending(client)

    assert response.status_code == 200
    assert response.json() == {
        "intent": "query_spending",
        "category_slug": "food",
        "currency": "VND",
        "date_range": {
            "start": "2026-07-01T00:00:00+07:00",
            "end": "2026-08-01T00:00:00+07:00",
            "label": "this_month",
        },
        "amount_minor": 50_000,
        "transaction_count": 2,
        "answer": "Tháng này bạn đã chi 50.000₫ cho food.",
        "needs_clarification": False,
        "clarification": None,
    }


@pytest.mark.parametrize(
    "message",
    [
        "Tháng này tôi ăn ngoài hết bao nhiêu?",
        "Tháng này tôi tiêu cho food hết bao nhiêu?",
    ],
)
def test_query_spending_supports_food_query_variants(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    message: str,
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_query_spending_transactions(session_factory))

    response = query_spending(client, message)

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "query_spending"
    assert payload["category_slug"] == "food"
    assert payload["amount_minor"] == 50_000


def test_query_spending_empty_ledger_returns_zero(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)

    response = query_spending(client)

    assert response.status_code == 200
    payload = response.json()
    assert payload["amount_minor"] == 0
    assert payload["transaction_count"] == 0
    assert payload["answer"] == "Tháng này bạn đã chi 0₫ cho food."


def test_query_spending_missing_category_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)

    response = query_spending(client, "Tháng này tôi tiêu hết bao nhiêu?")

    assert response.status_code == 200
    assert response.json() == {
        "intent": "query_spending",
        "category_slug": None,
        "currency": "VND",
        "date_range": None,
        "amount_minor": None,
        "transaction_count": 0,
        "answer": None,
        "needs_clarification": True,
        "clarification": {
            "message": "Bạn muốn hỏi chi tiêu cho danh mục nào?",
            "fields": ["category_slug"],
        },
    }
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_query_spending_invalid_category_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(
        client,
        StaticQueryProvider(result=query_result(category_slug="salary")),
    )

    response = query_spending(client)

    assert response.status_code == 200
    assert response.json()["needs_clarification"] is True
    assert response.json()["clarification"] == {
        "message": "Bạn muốn hỏi chi tiêu cho danh mục nào?",
        "fields": ["category_slug"],
    }


def test_query_spending_unsupported_date_range_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(
        client,
        StaticQueryProvider(result=query_result(date_range_label="last_month")),
    )

    response = query_spending(client)

    assert response.status_code == 200
    assert response.json()["needs_clarification"] is True
    assert response.json()["clarification"] == {
        "message": "Bạn muốn xem chi tiêu trong khoảng thời gian nào?",
        "fields": ["date_range"],
    }


def test_query_spending_unknown_intent_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(
        client,
        StaticQueryProvider(
            result=TransactionParseResult(
                intent=SupportedIntent.UNKNOWN,
                needs_confirmation=True,
                confidence=Confidence.LOW,
                missing_fields=["intent"],
            )
        ),
    )

    response = query_spending(client)

    assert response.status_code == 200
    assert response.json()["intent"] == "unknown"
    assert response.json()["needs_clarification"] is True
    assert response.json()["clarification"] == {
        "message": (
            "Mình chưa hiểu câu hỏi chi tiêu này. "
            "Bạn có thể hỏi theo danh mục và thời gian rõ hơn không?"
        ),
        "fields": ["intent"],
    }


def test_query_spending_rejects_empty_message(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = query_spending(client, "   ")

    assert response.status_code == 422


def test_query_spending_rejects_invalid_currency(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = query_spending(client, currency="USD")

    assert response.status_code == 422


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
def test_query_spending_maps_provider_errors_to_safe_api_errors(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    error: Exception,
    expected_status: int,
    expected_detail: str,
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(client, StaticQueryProvider(error=error))

    response = query_spending(client)

    assert response.status_code == expected_status
    assert response.json()["detail"] == expected_detail


def test_query_spending_is_read_only_for_ledger_budget_and_ai_state(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_query_spending_transactions(session_factory))
    budget_response = client.put(
        "/api/v1/budgets/monthly/2026/7",
        json={
            "currency": "VND",
            "total_budget_minor": 1_000_000,
            "category_budgets": [{"category_slug": "food", "budget_minor": 500_000}],
        },
    )
    assert budget_response.status_code == 200
    before_account = asyncio.run(fetch_account(session_factory))
    before_balance = before_account.current_balance_minor
    before_transactions = asyncio.run(count_transactions(session_factory))
    before_amounts = asyncio.run(fetch_transaction_amounts(session_factory))
    before_drafts = asyncio.run(count_ai_transaction_drafts(session_factory))
    before_budgets = asyncio.run(count_budget_periods(session_factory))

    response = query_spending(client)

    assert response.status_code == 200
    after_account = asyncio.run(fetch_account(session_factory))
    assert after_account.current_balance_minor == before_balance
    assert asyncio.run(count_transactions(session_factory)) == before_transactions
    assert asyncio.run(fetch_transaction_amounts(session_factory)) == before_amounts
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == before_drafts
    assert asyncio.run(count_budget_periods(session_factory)) == before_budgets
