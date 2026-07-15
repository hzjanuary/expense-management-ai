import asyncio
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient
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
from tests.conftest import (
    count_ai_transaction_drafts,
    count_transactions,
    fetch_account,
    fetch_ai_transaction_draft,
    seed_cash_account,
)


@dataclass(frozen=True, slots=True)
class StaticLlmProvider:
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
            model_name="static",
            available=self.error is None,
            reason=None,
        )


def override_provider(client: TestClient, provider: StaticLlmProvider) -> None:
    client.app.dependency_overrides[get_llm_provider] = lambda: provider


def parse_payload(
    client: TestClient,
    message: str = "Hôm nay tôi tiêu 35k vào ăn trưa",
    **extra: object,
) -> dict[str, object]:
    payload: dict[str, object] = {"message": message}
    payload.update(extra)
    response = client.post("/api/v1/ai/parse", json=payload)
    assert response.status_code == 200
    return response.json()


def create_transaction_result(**overrides: object) -> TransactionParseResult:
    payload: dict[str, object] = {
        "intent": SupportedIntent.CREATE_TRANSACTION,
        "transaction_type": "expense",
        "amount_minor": 35_000,
        "currency": "vnd",
        "category_slug": "food",
        "description": "ăn trưa",
        "merchant": None,
        "occurred_at_text": "hôm nay",
        "occurred_at_iso": None,
        "needs_confirmation": False,
        "confidence": Confidence.HIGH,
        "missing_fields": [],
    }
    payload.update(overrides)
    return TransactionParseResult.model_validate(payload)


def test_ai_parse_accepts_vietnamese_sample_with_default_fake_provider(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client

    payload = parse_payload(client)

    assert payload["intent"] == "create_transaction"
    assert isinstance(payload["draft_id"], str)
    assert payload["needs_confirmation"] is False
    assert payload["confidence"] == "high"
    assert payload["missing_fields"] == []
    assert payload["clarification"] is None
    draft = payload["draft"]
    assert isinstance(draft, dict)
    assert draft["type"] == "expense"
    assert draft["amount_minor"] == 35_000
    assert draft["currency"] == "VND"
    assert draft["category_slug"] == "food"
    assert draft["description"] == "ăn trưa"
    assert draft["merchant"] is None
    assert draft["occurred_at"] is None
    assert draft["source"] == "ai_chat"
    stored_draft = asyncio.run(
        fetch_ai_transaction_draft(session_factory, str(payload["draft_id"]))
    )
    assert stored_draft.status == "pending"
    assert stored_draft.amount_minor == 35_000
    assert stored_draft.category_slug == "food"
    assert stored_draft.raw_user_text == "Hôm nay tôi tiêu 35k vào ăn trưa"


def test_ai_parse_returns_unknown_low_confidence_for_unparseable_input(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client

    payload = parse_payload(client, "không rõ")

    assert payload == {
        "intent": "unknown",
        "draft_id": None,
        "draft": None,
        "needs_confirmation": True,
        "confidence": "low",
        "missing_fields": ["intent"],
        "clarification": {
            "message": (
                "Mình chưa hiểu bạn muốn ghi giao dịch hay hỏi thông tin gì. "
                "Bạn có thể nói rõ hơn không?"
            ),
            "fields": ["intent"],
        },
    }
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 0


def test_ai_parse_missing_amount_returns_clarification_without_draft(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))

    payload = parse_payload(client, "Hôm nay tôi ăn trưa")

    assert payload["intent"] == "create_transaction"
    assert payload["draft_id"] is None
    assert payload["draft"] is None
    assert payload["needs_confirmation"] is True
    assert payload["confidence"] == "low"
    assert payload["missing_fields"] == ["amount_minor"]
    assert payload["clarification"] == {
        "message": "Bạn muốn ghi khoản này với số tiền bao nhiêu?",
        "fields": ["amount_minor"],
    }
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 0
    assert asyncio.run(count_transactions(session_factory)) == 0
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000


def test_ai_parse_missing_category_returns_clarification_without_draft(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client

    payload = parse_payload(client, "Hôm nay tôi tiêu 35k")

    assert payload["intent"] == "create_transaction"
    assert payload["draft_id"] is None
    assert payload["draft"] is None
    assert payload["needs_confirmation"] is True
    assert payload["confidence"] == "low"
    assert payload["missing_fields"] == ["category_slug"]
    assert payload["clarification"] == {
        "message": "Khoản này thuộc danh mục nào?",
        "fields": ["category_slug"],
    }
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 0


def test_ai_parse_rejects_empty_message(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.post("/api/v1/ai/parse", json={"message": "   "})

    assert response.status_code == 422


def test_ai_parse_rejects_invalid_default_currency(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.post(
        "/api/v1/ai/parse",
        json={
            "message": "Hôm nay tôi tiêu 35k vào ăn trưa",
            "default_currency": "USD",
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("error", "expected_status", "expected_detail"),
    [
        (
            LlmProviderUnavailableError(),
            503,
            "LLM provider is unavailable",
        ),
        (
            LlmProviderTimeoutError(),
            504,
            "LLM provider timed out",
        ),
        (
            LlmProviderInvalidResponseError(),
            502,
            "LLM provider returned invalid structured output",
        ),
        (
            LlmProviderError(),
            502,
            "LLM provider error",
        ),
    ],
)
def test_ai_parse_maps_provider_errors_to_safe_api_errors(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
    error: Exception,
    expected_status: int,
    expected_detail: str,
) -> None:
    client, _session_factory = transaction_api_client
    override_provider(client, StaticLlmProvider(error=error))

    response = client.post(
        "/api/v1/ai/parse",
        json={"message": "Hôm nay tôi tiêu 35k vào ăn trưa"},
    )

    assert response.status_code == expected_status
    assert response.json()["detail"] == expected_detail


def test_ai_parse_invalid_category_returns_clarification_without_draft(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_provider(
        client,
        StaticLlmProvider(result=create_transaction_result(category_slug="unknown")),
    )

    response = client.post(
        "/api/v1/ai/parse",
        json={"message": "Hôm nay tôi tiêu 35k vào ăn trưa"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["draft_id"] is None
    assert payload["draft"] is None
    assert payload["missing_fields"] == ["category_slug"]
    assert payload["clarification"] == {
        "message": "Khoản này thuộc danh mục nào?",
        "fields": ["category_slug"],
    }
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 0


def test_ai_parse_income_category_for_expense_returns_clarification_without_draft(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_provider(
        client,
        StaticLlmProvider(result=create_transaction_result(category_slug="salary")),
    )

    response = client.post(
        "/api/v1/ai/parse",
        json={"message": "Hôm nay tôi tiêu 35k vào ăn trưa"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["draft_id"] is None
    assert payload["draft"] is None
    assert payload["missing_fields"] == ["category_slug"]
    assert payload["clarification"] == {
        "message": "Khoản này thuộc danh mục nào?",
        "fields": ["category_slug"],
    }
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 0


def test_ai_parse_income_with_expense_category_returns_clarification_without_draft(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_provider(
        client,
        StaticLlmProvider(
            result=create_transaction_result(
                transaction_type="income",
                category_slug="food",
                description="ăn trưa",
            )
        ),
    )

    response = client.post(
        "/api/v1/ai/parse",
        json={"message": "Hôm nay tôi tiêu 35k vào ăn trưa"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["draft_id"] is None
    assert payload["draft"] is None
    assert payload["missing_fields"] == ["category_slug"]
    assert payload["clarification"] == {
        "message": "Khoản này thuộc danh mục nào?",
        "fields": ["category_slug"],
    }
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 0


def test_ai_parse_missing_high_confidence_amount_returns_clarification(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_provider(
        client,
        StaticLlmProvider(
            result=create_transaction_result(
                amount_minor=None,
                missing_fields=["amount_minor"],
                needs_confirmation=True,
                confidence=Confidence.LOW,
            )
        ),
    )

    payload = parse_payload(client)

    assert payload["draft_id"] is None
    assert payload["draft"] is None
    assert payload["missing_fields"] == ["amount_minor"]
    assert payload["clarification"] == {
        "message": "Bạn muốn ghi khoản này với số tiền bao nhiêu?",
        "fields": ["amount_minor"],
    }
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == 0


def test_ai_parse_complete_low_confidence_valid_draft_is_persisted_for_confirmation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    override_provider(
        client,
        StaticLlmProvider(
            result=create_transaction_result(
                needs_confirmation=True,
                confidence=Confidence.LOW,
            )
        ),
    )

    payload = parse_payload(client)

    assert isinstance(payload["draft_id"], str)
    assert isinstance(payload["draft"], dict)
    assert payload["needs_confirmation"] is True
    assert payload["confidence"] == "low"
    assert payload["clarification"] == {
        "message": "Mình hiểu giao dịch này nhưng cần bạn xác nhận trước khi ghi sổ.",
        "fields": [],
    }
    assert asyncio.run(count_transactions(session_factory)) == 0
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    stored_draft = asyncio.run(
        fetch_ai_transaction_draft(session_factory, str(payload["draft_id"]))
    )
    assert stored_draft.status == "pending"
    assert stored_draft.confidence == "low"


def test_ai_parse_does_not_create_transaction_or_change_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))

    payload = parse_payload(client)

    assert payload["intent"] == "create_transaction"
    assert isinstance(payload["draft_id"], str)
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_health_does_not_require_ai_provider_availability(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client
    override_provider(client, StaticLlmProvider(error=LlmProviderUnavailableError()))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
