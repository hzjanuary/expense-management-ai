import asyncio
import json
import os
from typing import Any

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ai.errors import (
    LlmProviderError,
    LlmProviderInvalidResponseError,
    LlmProviderTimeoutError,
    LlmProviderUnavailableError,
)
from app.ai.ollama import SYSTEM_PROMPT, OllamaLlmProvider
from app.ai.providers import LlmProvider
from app.ai.schemas import (
    Confidence,
    SupportedIntent,
    TransactionParseRequest,
    TransactionParseResult,
)
from tests.conftest import count_transactions, fetch_account, seed_cash_account


def make_client(handler: httpx.MockTransport) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=handler)


def ollama_provider(
    client: httpx.AsyncClient,
    *,
    enabled: bool = True,
) -> OllamaLlmProvider:
    return OllamaLlmProvider(
        base_url="http://ollama.test",
        model_name="qwen2.5:3b",
        timeout_seconds=2,
        enabled=enabled,
        client=client,
    )


def parse_success_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "intent": "create_transaction",
        "transaction_type": "expense",
        "amount_minor": 35_000,
        "currency": "vnd",
        "category_slug": "food",
        "description": "ăn trưa",
        "merchant": None,
        "occurred_at_text": "hôm nay",
        "occurred_at_iso": None,
        "needs_confirmation": False,
        "confidence": "high",
        "missing_fields": [],
    }
    payload.update(overrides)
    return {"message": {"content": json.dumps(payload)}}


@pytest.mark.anyio
async def test_ollama_status_when_disabled() -> None:
    async with make_client(
        httpx.MockTransport(lambda request: httpx.Response(500))
    ) as client:
        provider = ollama_provider(client, enabled=False)

        status = await provider.get_status()

    assert status.provider_name == "ollama"
    assert status.model_name == "qwen2.5:3b"
    assert status.available is False
    assert status.reason == "disabled"


@pytest.mark.anyio
async def test_ollama_status_when_reachable() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/api/tags"
        return httpx.Response(200, json={"models": []})

    async with make_client(httpx.MockTransport(handler)) as client:
        provider = ollama_provider(client)

        status = await provider.get_status()

    assert status.available is True
    assert status.reason is None


@pytest.mark.anyio
async def test_ollama_status_when_unreachable() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connect failed", request=request)

    async with make_client(httpx.MockTransport(handler)) as client:
        provider = ollama_provider(client)

        status = await provider.get_status()

    assert status.available is False
    assert status.reason == "unreachable"


@pytest.mark.anyio
async def test_ollama_successful_parse_returns_structured_result() -> None:
    captured_payload: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/api/chat"
        captured_payload.update(json.loads(request.content))
        return httpx.Response(200, json=parse_success_payload())

    async with make_client(httpx.MockTransport(handler)) as client:
        provider: LlmProvider = ollama_provider(client)

        result = await provider.parse_transaction_text(
            TransactionParseRequest(message="Hôm nay tôi tiêu 35k vào ăn trưa")
        )

    assert result.intent == SupportedIntent.CREATE_TRANSACTION
    assert result.transaction_type == "expense"
    assert result.amount_minor == 35_000
    assert result.currency == "VND"
    assert result.category_slug == "food"
    assert result.needs_confirmation is False
    assert result.confidence == Confidence.HIGH
    assert captured_payload["model"] == "qwen2.5:3b"
    assert captured_payload["stream"] is False
    assert captured_payload["format"] == TransactionParseResult.model_json_schema()
    assert captured_payload["options"] == {"temperature": 0}
    assert captured_payload["messages"][0]["content"] == SYSTEM_PROMPT


@pytest.mark.anyio
async def test_ollama_successful_parse_validates_integer_amount_and_currency() -> None:
    async with make_client(
        httpx.MockTransport(
            lambda request: httpx.Response(200, json=parse_success_payload())
        )
    ) as client:
        provider = ollama_provider(client)

        result = await provider.parse_transaction_text(
            TransactionParseRequest(message="Hôm nay tôi tiêu 35k vào ăn trưa")
        )

    assert isinstance(result.amount_minor, int)
    assert result.amount_minor == 35_000
    assert result.currency == "VND"


@pytest.mark.anyio
async def test_ollama_timeout_maps_to_provider_timeout_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    async with make_client(httpx.MockTransport(handler)) as client:
        provider = ollama_provider(client)

        with pytest.raises(LlmProviderTimeoutError):
            await provider.parse_transaction_text(
                TransactionParseRequest(message="hello")
            )


@pytest.mark.anyio
async def test_ollama_connection_failure_maps_to_provider_unavailable_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connect failed", request=request)

    async with make_client(httpx.MockTransport(handler)) as client:
        provider = ollama_provider(client)

        with pytest.raises(LlmProviderUnavailableError):
            await provider.parse_transaction_text(
                TransactionParseRequest(message="hello")
            )


@pytest.mark.anyio
async def test_ollama_non_2xx_maps_to_provider_error() -> None:
    async with make_client(
        httpx.MockTransport(lambda request: httpx.Response(500, json={"error": "boom"}))
    ) as client:
        provider = ollama_provider(client)

        with pytest.raises(LlmProviderError) as exc_info:
            await provider.parse_transaction_text(
                TransactionParseRequest(message="hello")
            )

    assert str(exc_info.value) == "LLM provider returned an unsuccessful response"


@pytest.mark.anyio
async def test_ollama_missing_message_content_maps_to_invalid_response() -> None:
    async with make_client(
        httpx.MockTransport(lambda request: httpx.Response(200, json={"message": {}}))
    ) as client:
        provider = ollama_provider(client)

        with pytest.raises(LlmProviderInvalidResponseError):
            await provider.parse_transaction_text(
                TransactionParseRequest(message="hello")
            )


@pytest.mark.anyio
async def test_ollama_invalid_json_maps_to_invalid_response() -> None:
    async with make_client(
        httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json={"message": {"content": "{not-json"}},
            )
        )
    ) as client:
        provider = ollama_provider(client)

        with pytest.raises(LlmProviderInvalidResponseError):
            await provider.parse_transaction_text(
                TransactionParseRequest(message="hello")
            )


@pytest.mark.anyio
async def test_ollama_schema_invalid_json_maps_to_invalid_response() -> None:
    async with make_client(
        httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json=parse_success_payload(amount_minor=35.5),
            )
        )
    ) as client:
        provider = ollama_provider(client)

        with pytest.raises(LlmProviderInvalidResponseError):
            await provider.parse_transaction_text(
                TransactionParseRequest(message="hello")
            )


def test_ollama_adapter_does_not_mutate_ledger(
    transaction_api_client: tuple[object, async_sessionmaker[AsyncSession]],
) -> None:
    _client, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))

    async def parse_with_provider() -> TransactionParseResult:
        async with make_client(
            httpx.MockTransport(
                lambda request: httpx.Response(200, json=parse_success_payload())
            )
        ) as client:
            provider = ollama_provider(client)
            return await provider.parse_transaction_text(
                TransactionParseRequest(message="Hôm nay tôi tiêu 35k vào ăn trưa")
            )

    result = asyncio.run(parse_with_provider())

    assert result.intent == SupportedIntent.CREATE_TRANSACTION
    account = asyncio.run(fetch_account(session_factory))
    assert account.current_balance_minor == 1_000_000
    assert asyncio.run(count_transactions(session_factory)) == 0


@pytest.mark.skipif(
    os.getenv("POCKET_LEDGER_RUN_OLLAMA_INTEGRATION") != "1",
    reason="real Ollama integration is opt-in",
)
@pytest.mark.anyio
async def test_real_ollama_integration_smoke() -> None:
    provider = OllamaLlmProvider(enabled=True)

    status = await provider.get_status()

    assert status.provider_name == "ollama"
