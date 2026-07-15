import asyncio

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.errors import (
    LlmProviderInvalidResponseError,
    LlmProviderTimeoutError,
    LlmProviderUnavailableError,
)
from app.ai.fake import FakeLlmProvider
from app.ai.providers import LlmProvider
from app.ai.schemas import (
    Confidence,
    SupportedIntent,
    TransactionParseRequest,
    TransactionParseResult,
)
from tests.conftest import count_transactions, fetch_account, seed_cash_account


def test_parse_request_validates_non_empty_message() -> None:
    with pytest.raises(ValidationError):
        TransactionParseRequest(message="   ")


def test_parse_request_validates_default_currency() -> None:
    with pytest.raises(ValidationError):
        TransactionParseRequest(message="hello", default_currency="USD")


def test_parse_request_normalizes_default_currency() -> None:
    request = TransactionParseRequest(message="hello", default_currency="vnd")

    assert request.default_currency == "VND"


@pytest.mark.anyio
async def test_fake_provider_returns_provider_status() -> None:
    provider: LlmProvider = FakeLlmProvider()

    status = await provider.get_status()

    assert status.provider_name == "fake"
    assert status.model_name == "fake-structured-parser"
    assert status.available is True
    assert status.reason is None


@pytest.mark.anyio
async def test_fake_provider_returns_structured_create_transaction_result() -> None:
    provider: LlmProvider = FakeLlmProvider()
    request = TransactionParseRequest(message="Hôm nay tôi tiêu 35k vào ăn trưa")

    result = await provider.parse_transaction_text(request)

    assert result == TransactionParseResult(
        intent=SupportedIntent.CREATE_TRANSACTION,
        transaction_type="expense",
        amount_minor=35_000,
        currency="VND",
        category_slug="food",
        description="ăn trưa",
        merchant=None,
        occurred_at_text="hôm nay",
        occurred_at_iso=None,
        needs_confirmation=False,
        confidence=Confidence.HIGH,
        missing_fields=[],
    )


@pytest.mark.anyio
async def test_result_amount_and_currency_are_normalized() -> None:
    provider = FakeLlmProvider()

    result = await provider.parse_transaction_text(
        TransactionParseRequest(
            message="Hôm nay tôi tiêu 35k vào ăn trưa",
            default_currency="vnd",
        )
    )

    assert isinstance(result.amount_minor, int)
    assert result.amount_minor == 35_000
    assert result.currency == "VND"


@pytest.mark.anyio
async def test_fake_provider_returns_unknown_for_unparseable_input() -> None:
    provider = FakeLlmProvider()

    result = await provider.parse_transaction_text(
        TransactionParseRequest(message="không rõ")
    )

    assert result.intent == SupportedIntent.UNKNOWN
    assert result.needs_confirmation is True
    assert result.confidence == Confidence.LOW
    assert result.missing_fields == ["intent"]


@pytest.mark.anyio
async def test_provider_invalid_response_error_is_deterministic() -> None:
    provider = FakeLlmProvider(mode="invalid_response")

    with pytest.raises(LlmProviderInvalidResponseError) as exc_info:
        await provider.parse_transaction_text(TransactionParseRequest(message="hello"))

    assert str(exc_info.value) == "LLM provider returned invalid structured output"


@pytest.mark.anyio
async def test_provider_unavailable_and_timeout_errors_are_distinct() -> None:
    unavailable_provider = FakeLlmProvider(mode="unavailable")
    timeout_provider = FakeLlmProvider(mode="timeout")

    with pytest.raises(LlmProviderUnavailableError):
        await unavailable_provider.parse_transaction_text(
            TransactionParseRequest(message="hello")
        )
    with pytest.raises(LlmProviderTimeoutError):
        await timeout_provider.parse_transaction_text(
            TransactionParseRequest(message="hello")
        )


def test_provider_errors_do_not_expose_raw_provider_internals() -> None:
    custom_error = LlmProviderUnavailableError("raw socket failure")

    assert str(custom_error) == "raw socket failure"
    assert str(LlmProviderUnavailableError()) == "LLM provider is unavailable"


def test_fake_provider_parsing_does_not_mutate_ledger(
    transaction_api_client: tuple[object, async_sessionmaker[AsyncSession]],
) -> None:
    _client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))
    provider = FakeLlmProvider()

    result = asyncio.run(
        provider.parse_transaction_text(
            TransactionParseRequest(message="Hôm nay tôi tiêu 35k vào ăn trưa")
        )
    )

    assert result.intent == SupportedIntent.CREATE_TRANSACTION
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0
