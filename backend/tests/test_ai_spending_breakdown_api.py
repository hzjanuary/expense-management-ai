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
class StaticBreakdownProvider:
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
            model_name="static-breakdown",
            available=self.error is None,
            reason=None,
        )


def override_now(client: TestClient) -> None:
    client.app.dependency_overrides[get_current_time] = lambda: QUERY_NOW


def override_provider(client: TestClient, provider: StaticBreakdownProvider) -> None:
    client.app.dependency_overrides[get_llm_provider] = lambda: provider


def query_spending_breakdown(
    client: TestClient,
    message: str = "Tuần này tôi tiêu nhiều nhất vào mục nào?",
    **extra: object,
):
    payload: dict[str, object] = {"message": message}
    payload.update(extra)
    return client.post("/api/v1/ai/query-spending-breakdown", json=payload)


def breakdown_result(**overrides: object) -> TransactionParseResult:
    payload: dict[str, object] = {
        "intent": SupportedIntent.SPENDING_BREAKDOWN,
        "transaction_type": None,
        "amount_minor": None,
        "currency": "VND",
        "category_slug": None,
        "description": None,
        "merchant": None,
        "occurred_at_text": None,
        "occurred_at_iso": None,
        "date_range_label": "this_week",
        "needs_confirmation": False,
        "confidence": Confidence.HIGH,
        "missing_fields": [],
    }
    payload.update(overrides)
    return TransactionParseResult.model_validate(payload)


async def seed_breakdown_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory, balance_minor=1_000_000)
    await seed_transaction(
        session_factory,
        transaction_id="97000000-0000-0000-0000-000000000001",
        transaction_type="expense",
        amount_minor=100_000,
        category_slug="food",
        description="ăn trưa",
        occurred_at=datetime(2026, 7, 14, 12, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="97000000-0000-0000-0000-000000000002",
        transaction_type="expense",
        amount_minor=50_000,
        category_slug="food",
        description="bún",
        occurred_at=datetime(2026, 7, 15, 4, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="97000000-0000-0000-0000-000000000003",
        transaction_type="expense",
        amount_minor=30_000,
        category_slug="food",
        description="cà phê sau ăn",
        occurred_at=datetime(2026, 7, 16, 5, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="97000000-0000-0000-0000-000000000004",
        transaction_type="expense",
        amount_minor=50_000,
        category_slug="transport",
        description="taxi",
        occurred_at=datetime(2026, 7, 14, 3, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="97000000-0000-0000-0000-000000000005",
        transaction_type="expense",
        amount_minor=55_000,
        category_slug="transport",
        description="xe công nghệ",
        occurred_at=datetime(2026, 7, 15, 3, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="97000000-0000-0000-0000-000000000006",
        transaction_type="income",
        amount_minor=999_000,
        category_slug="food",
        description="not an expense",
        occurred_at=datetime(2026, 7, 15, 6, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="97000000-0000-0000-0000-000000000007",
        transaction_type="expense",
        amount_minor=70_000,
        category_slug="coffee",
        description="outside week",
        occurred_at=datetime(2026, 7, 12, 10, 0, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="97000000-0000-0000-0000-000000000008",
        transaction_type="expense",
        amount_minor=500_000,
        category_slug="food",
        description="deleted food",
        occurred_at=datetime(2026, 7, 15, 7, 0, tzinfo=UTC),
        deleted_at=datetime(2026, 7, 15, 8, 0, tzinfo=UTC),
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


def test_spending_breakdown_returns_db_grounded_top_category(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_breakdown_transactions(session_factory))

    response = query_spending_breakdown(client)

    assert response.status_code == 200
    assert response.json() == {
        "intent": "spending_breakdown",
        "currency": "VND",
        "date_range": {
            "start": "2026-07-13T00:00:00+07:00",
            "end": "2026-07-20T00:00:00+07:00",
            "label": "this_week",
        },
        "total_expense_minor": 285_000,
        "transaction_count": 5,
        "top_category": {
            "category_slug": "food",
            "amount_minor": 180_000,
            "transaction_count": 3,
            "percentage": 63.16,
        },
        "breakdown": [
            {
                "category_slug": "food",
                "amount_minor": 180_000,
                "transaction_count": 3,
                "percentage": 63.16,
            },
            {
                "category_slug": "transport",
                "amount_minor": 105_000,
                "transaction_count": 2,
                "percentage": 36.84,
            },
        ],
        "answer": "Tuần này bạn chi nhiều nhất cho food: 180.000₫.",
        "needs_clarification": False,
        "clarification": None,
    }


@pytest.mark.parametrize(
    "message",
    [
        "Tuần này mục nào tôi tiêu nhiều nhất?",
        "Tôi chi nhiều nhất vào đâu tuần này?",
        "Top chi tiêu tuần này là gì?",
    ],
)
def test_spending_breakdown_supports_query_variants(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    message: str,
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_breakdown_transactions(session_factory))

    response = query_spending_breakdown(client, message)

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "spending_breakdown"
    assert payload["top_category"]["category_slug"] == "food"
    assert payload["total_expense_minor"] == 285_000


def test_spending_breakdown_empty_week_returns_safe_zero_answer(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)

    response = query_spending_breakdown(client)

    assert response.status_code == 200
    assert response.json() == {
        "intent": "spending_breakdown",
        "currency": "VND",
        "date_range": {
            "start": "2026-07-13T00:00:00+07:00",
            "end": "2026-07-20T00:00:00+07:00",
            "label": "this_week",
        },
        "total_expense_minor": 0,
        "transaction_count": 0,
        "top_category": None,
        "breakdown": [],
        "answer": "Bạn chưa có khoản chi nào trong tuần này.",
        "needs_clarification": False,
        "clarification": None,
    }


def test_spending_breakdown_tie_by_amount_uses_transaction_count(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_cash_account(session_factory))
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="97100000-0000-0000-0000-000000000001",
            transaction_type="expense",
            amount_minor=60_000,
            category_slug="food",
            description="meal",
            occurred_at=datetime(2026, 7, 14, 1, 0, tzinfo=UTC),
        )
    )
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="97100000-0000-0000-0000-000000000002",
            transaction_type="expense",
            amount_minor=40_000,
            category_slug="food",
            description="snack",
            occurred_at=datetime(2026, 7, 14, 2, 0, tzinfo=UTC),
        )
    )
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="97100000-0000-0000-0000-000000000003",
            transaction_type="expense",
            amount_minor=100_000,
            category_slug="transport",
            description="taxi",
            occurred_at=datetime(2026, 7, 14, 3, 0, tzinfo=UTC),
        )
    )

    response = query_spending_breakdown(client)

    assert response.status_code == 200
    payload = response.json()
    assert payload["top_category"]["category_slug"] == "food"
    assert [item["category_slug"] for item in payload["breakdown"]] == [
        "food",
        "transport",
    ]


def test_spending_breakdown_full_tie_uses_category_slug(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_cash_account(session_factory))
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="97200000-0000-0000-0000-000000000001",
            transaction_type="expense",
            amount_minor=100_000,
            category_slug="food",
            description="meal",
            occurred_at=datetime(2026, 7, 14, 1, 0, tzinfo=UTC),
        )
    )
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="97200000-0000-0000-0000-000000000002",
            transaction_type="expense",
            amount_minor=100_000,
            category_slug="coffee",
            description="coffee",
            occurred_at=datetime(2026, 7, 14, 2, 0, tzinfo=UTC),
        )
    )

    response = query_spending_breakdown(client)

    assert response.status_code == 200
    payload = response.json()
    assert payload["top_category"]["category_slug"] == "coffee"
    assert [item["category_slug"] for item in payload["breakdown"]] == [
        "coffee",
        "food",
    ]


def test_spending_breakdown_unknown_intent_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)

    response = query_spending_breakdown(client, "Bạn có thể làm gì?")

    assert response.status_code == 200
    assert response.json() == {
        "intent": "unknown",
        "currency": "VND",
        "date_range": None,
        "total_expense_minor": None,
        "transaction_count": 0,
        "top_category": None,
        "breakdown": [],
        "answer": None,
        "needs_clarification": True,
        "clarification": {
            "message": (
                "Mình chưa hiểu câu hỏi phân tích chi tiêu này. "
                "Bạn có thể hỏi rõ khoảng thời gian hơn không?"
            ),
            "fields": ["intent"],
        },
    }


def test_spending_breakdown_missing_date_range_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)

    response = query_spending_breakdown(client, "Tôi tiêu nhiều nhất vào mục nào?")

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "spending_breakdown"
    assert payload["needs_clarification"] is True
    assert payload["clarification"]["fields"] == ["date_range"]
    assert payload["top_category"] is None
    assert payload["breakdown"] == []


def test_spending_breakdown_unsupported_date_range_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(
        client,
        StaticBreakdownProvider(result=breakdown_result(date_range_label="this_month")),
    )

    response = query_spending_breakdown(client)

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "spending_breakdown"
    assert payload["needs_clarification"] is True
    assert payload["clarification"]["fields"] == ["date_range"]


def test_spending_breakdown_empty_message_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = query_spending_breakdown(client, " ")

    assert response.status_code == 422


def test_spending_breakdown_invalid_currency_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = query_spending_breakdown(client, currency="USD")

    assert response.status_code == 422


def test_spending_breakdown_invalid_timezone_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = query_spending_breakdown(client, timezone="Invalid/Timezone")

    assert response.status_code == 422
    assert response.json()["detail"] == "timezone is invalid"


@pytest.mark.parametrize(
    ("provider_error", "status_code", "detail"),
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
def test_spending_breakdown_provider_errors_are_mapped(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    provider_error: Exception,
    status_code: int,
    detail: str,
) -> None:
    client, _session_factory = transaction_api_client
    override_now(client)
    override_provider(client, StaticBreakdownProvider(error=provider_error))

    response = query_spending_breakdown(client)

    assert response.status_code == status_code
    assert response.json() == {"detail": detail}


def test_spending_breakdown_is_read_only(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_now(client)
    asyncio.run(seed_breakdown_transactions(session_factory))
    before_balance = asyncio.run(fetch_account(session_factory)).current_balance_minor
    before_transaction_count = asyncio.run(count_transactions(session_factory))
    before_transaction_amounts = asyncio.run(fetch_transaction_amounts(session_factory))
    before_budget_count = asyncio.run(count_budget_periods(session_factory))
    before_category_budget_count = asyncio.run(count_category_budgets(session_factory))
    before_draft_count = asyncio.run(count_ai_transaction_drafts(session_factory))

    response = query_spending_breakdown(client)

    assert response.status_code == 200
    assert asyncio.run(fetch_account(session_factory)).current_balance_minor == (
        before_balance
    )
    assert asyncio.run(count_transactions(session_factory)) == before_transaction_count
    assert asyncio.run(fetch_transaction_amounts(session_factory)) == (
        before_transaction_amounts
    )
    assert asyncio.run(count_budget_periods(session_factory)) == before_budget_count
    assert asyncio.run(count_category_budgets(session_factory)) == (
        before_category_budget_count
    )
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == (
        before_draft_count
    )
