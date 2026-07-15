import asyncio
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.factory import get_llm_provider
from app.ai.schemas import (
    Confidence,
    LlmProviderStatus,
    SupportedIntent,
    TransactionParseRequest,
    TransactionParseResult,
)
from app.db.models import AiTransactionDraftModel
from tests.conftest import (
    count_transactions,
    fetch_account,
    fetch_ai_transaction_draft,
    fetch_transaction,
    seed_account,
    seed_cash_account,
)


@dataclass(slots=True)
class CountingLlmProvider:
    result: TransactionParseResult
    parse_calls: int = 0

    async def parse_transaction_text(
        self,
        request: TransactionParseRequest,
    ) -> TransactionParseResult:
        self.parse_calls += 1
        return self.result

    async def get_status(self) -> LlmProviderStatus:
        return LlmProviderStatus(
            provider_name="counting",
            model_name="counting-model",
            available=True,
            reason=None,
        )


def create_transaction_result(**overrides: object) -> TransactionParseResult:
    payload: dict[str, object] = {
        "intent": SupportedIntent.CREATE_TRANSACTION,
        "transaction_type": "expense",
        "amount_minor": 35_000,
        "currency": "VND",
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


def override_provider(client: TestClient, provider: CountingLlmProvider) -> None:
    client.app.dependency_overrides[get_llm_provider] = lambda: provider


def parse_draft(client: TestClient) -> str:
    response = client.post(
        "/api/v1/ai/parse",
        json={"message": "Hôm nay tôi tiêu 35k vào ăn trưa"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["draft_id"], str)
    return payload["draft_id"]


def confirm_draft(client: TestClient, draft_id: str):
    return client.post("/api/v1/ai/confirm", json={"draft_id": draft_id})


async def seed_ai_draft(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    draft_id: str = "draft-1",
    transaction_type: str = "expense",
    amount_minor: int = 35_000,
    currency: str = "VND",
    category_slug: str = "food",
    description: str = "ăn trưa",
    status: str = "pending",
    expires_at: datetime | None = None,
) -> None:
    expiration = expires_at or datetime.now(UTC) + timedelta(minutes=15)
    async with session_factory() as session:
        async with session.begin():
            session.add(
                AiTransactionDraftModel(
                    id=draft_id,
                    intent="create_transaction",
                    transaction_type=transaction_type,
                    amount_minor=amount_minor,
                    currency=currency,
                    category_slug=category_slug,
                    description=description,
                    merchant=None,
                    occurred_at=None,
                    occurred_at_text="hôm nay",
                    source="ai_chat",
                    confidence="high",
                    needs_confirmation=False,
                    missing_fields_json=json.dumps([]),
                    raw_user_text="Hôm nay tôi tiêu 35k vào ăn trưa",
                    provider_name="test",
                    model_name="test-model",
                    status=status,
                    expires_at=expiration,
                )
            )


def test_parse_returns_draft_id_and_stores_pending_draft(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client

    draft_id = parse_draft(client)

    draft = asyncio.run(fetch_ai_transaction_draft(session_factory, draft_id))
    assert draft.status == "pending"
    assert draft.intent == "create_transaction"
    assert draft.source == "ai_chat"
    assert draft.expires_at is not None


def test_confirming_valid_expense_creates_transaction_and_decreases_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    provider = CountingLlmProvider(create_transaction_result())
    override_provider(client, provider)
    draft_id = parse_draft(client)

    response = confirm_draft(client, draft_id)

    assert response.status_code == 200
    payload = response.json()
    assert payload["account_balance_minor"] == 965_000
    transaction = payload["transaction"]
    assert transaction["type"] == "expense"
    assert transaction["amount_minor"] == 35_000
    assert transaction["currency"] == "VND"
    assert transaction["category_slug"] == "food"
    assert transaction["merchant"] is None
    assert transaction["source"] == "ai_chat"
    assert transaction["occurred_at"] is not None
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 965_000
    assert asyncio.run(count_transactions(session_factory)) == 1
    stored_draft = asyncio.run(fetch_ai_transaction_draft(session_factory, draft_id))
    assert stored_draft.status == "confirmed"
    assert stored_draft.created_transaction_id == transaction["id"]
    assert stored_draft.confirmed_at is not None
    assert provider.parse_calls == 1


def test_confirming_valid_income_creates_transaction_and_increases_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    provider = CountingLlmProvider(
        create_transaction_result(
            transaction_type="income",
            amount_minor=10_000_000,
            category_slug="salary",
            description="lương tháng 7",
        )
    )
    override_provider(client, provider)
    draft_id = parse_draft(client)

    response = confirm_draft(client, draft_id)

    assert response.status_code == 200
    payload = response.json()
    assert payload["account_balance_minor"] == 11_000_000
    assert payload["transaction"]["type"] == "income"
    assert payload["transaction"]["category_slug"] == "salary"
    assert payload["transaction"]["source"] == "ai_chat"
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 11_000_000
    assert asyncio.run(count_transactions(session_factory)) == 1


def test_confirming_same_draft_twice_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    draft_id = parse_draft(client)

    first_response = confirm_draft(client, draft_id)
    second_response = confirm_draft(client, draft_id)

    assert first_response.status_code == 200
    assert second_response.status_code == 422
    assert second_response.json()["detail"] == "AI draft is not pending"
    assert asyncio.run(count_transactions(session_factory)) == 1
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 965_000


def test_expired_draft_is_rejected_without_ledger_mutation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    asyncio.run(
        seed_ai_draft(
            session_factory,
            draft_id="expired-draft",
            expires_at=datetime.now(UTC) - timedelta(seconds=1),
        )
    )

    response = confirm_draft(client, "expired-draft")

    assert response.status_code == 422
    assert response.json()["detail"] == "AI draft is expired"
    assert asyncio.run(count_transactions(session_factory)) == 0
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    draft = asyncio.run(fetch_ai_transaction_draft(session_factory, "expired-draft"))
    assert draft.status == "expired"


def test_missing_draft_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = confirm_draft(client, "missing-draft")

    assert response.status_code == 404
    assert response.json()["detail"] == "AI draft not found"


def test_invalid_stored_category_cannot_be_confirmed_atomically(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    asyncio.run(
        seed_ai_draft(
            session_factory,
            draft_id="invalid-category",
            category_slug="unknown",
        )
    )

    response = confirm_draft(client, "invalid-category")

    assert response.status_code == 422
    assert "unknown category" in response.json()["detail"]
    assert asyncio.run(count_transactions(session_factory)) == 0
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    draft = asyncio.run(fetch_ai_transaction_draft(session_factory, "invalid-category"))
    assert draft.status == "pending"


def test_income_category_for_expense_cannot_be_confirmed(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    asyncio.run(
        seed_ai_draft(
            session_factory,
            draft_id="income-category-expense",
            category_slug="salary",
        )
    )

    response = confirm_draft(client, "income-category-expense")

    assert response.status_code == 422
    assert "cannot be used for expense" in response.json()["detail"]
    assert asyncio.run(count_transactions(session_factory)) == 0


def test_currency_account_mismatch_is_rejected_without_partial_mutation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(
        seed_account(
            session_factory,
            name="Cash Wallet",
            balance_minor=1_000_000,
            currency="USD",
        )
    )
    asyncio.run(seed_ai_draft(session_factory, draft_id="currency-mismatch"))

    response = confirm_draft(client, "currency-mismatch")

    assert response.status_code == 422
    assert (
        response.json()["detail"] == "transaction currency must match account currency"
    )
    assert asyncio.run(count_transactions(session_factory)) == 0
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    draft = asyncio.run(
        fetch_ai_transaction_draft(session_factory, "currency-mismatch")
    )
    assert draft.status == "pending"


def test_confirmation_does_not_call_provider_again(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    provider = CountingLlmProvider(create_transaction_result())
    override_provider(client, provider)
    draft_id = parse_draft(client)

    response = confirm_draft(client, draft_id)

    assert response.status_code == 200
    assert provider.parse_calls == 1
    transaction = asyncio.run(fetch_transaction(session_factory))
    assert transaction.source == "ai_chat"
    assert transaction.raw_user_text == "Hôm nay tôi tiêu 35k vào ăn trưa"
    assert transaction.parser_confidence == "high"


def test_complete_low_confidence_draft_mutates_only_after_confirmation(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    provider = CountingLlmProvider(
        create_transaction_result(
            needs_confirmation=True,
            confidence=Confidence.LOW,
        )
    )
    override_provider(client, provider)
    draft_id = parse_draft(client)

    assert asyncio.run(count_transactions(session_factory)) == 0
    account_before = asyncio.run(fetch_account(session_factory))
    assert account_before.current_balance_minor == 1_000_000

    response = confirm_draft(client, draft_id)

    assert response.status_code == 200
    assert response.json()["account_balance_minor"] == 965_000
    transaction = asyncio.run(fetch_transaction(session_factory))
    assert transaction.source == "ai_chat"
    assert transaction.parser_confidence == "low"
