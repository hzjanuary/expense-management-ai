import json
from dataclasses import dataclass
from typing import Any

import httpx
from pydantic import ValidationError

from app.ai.errors import (
    LlmProviderError,
    LlmProviderInvalidResponseError,
    LlmProviderTimeoutError,
    LlmProviderUnavailableError,
)
from app.ai.schemas import (
    LlmProviderStatus,
    TransactionParseRequest,
    TransactionParseResult,
)
from app.core.config import get_settings

SYSTEM_PROMPT = """You extract local-first expense manager intents into JSON.
Return only JSON matching the provided schema. Do not include commentary,
markdown, or code fences. Extract only what is present or reasonably inferable.
Use intent "unknown" when the user intent is unsupported. Use
needs_confirmation=true for ambiguous cases. Do not invent amounts, categories,
merchants, or dates. Vietnamese amount rules: 35k, 35 nghìn, and 35 ngàn mean
35000; 1tr, 1 triệu, and 1m mean 1000000. You are not allowed to perform ledger
mutations, create transactions, update balances, or persist records. For
spending questions, classify intent as query_spending and extract category_slug,
currency, and date_range_label only. For budget remaining questions, classify
intent as budget_remaining and extract category_slug, currency, and
date_range_label only. For top category or spending breakdown questions,
classify intent as spending_breakdown and extract currency and date_range_label
only. Supported query date ranges are this_month for category spending and
budget remaining, and this_week for spending breakdown. Do not answer totals or
choose top categories yourself."""


@dataclass(slots=True)
class OllamaLlmProvider:
    base_url: str | None = None
    model_name: str | None = None
    timeout_seconds: float | None = None
    enabled: bool | None = None
    client: httpx.AsyncClient | None = None

    @property
    def resolved_base_url(self) -> str:
        return (self.base_url or get_settings().ollama_base_url).rstrip("/")

    @property
    def resolved_model_name(self) -> str:
        return self.model_name or get_settings().ollama_model

    @property
    def resolved_timeout_seconds(self) -> float:
        return self.timeout_seconds or get_settings().ollama_timeout_seconds

    @property
    def resolved_enabled(self) -> bool:
        if self.enabled is not None:
            return self.enabled
        return get_settings().ollama_enabled

    async def parse_transaction_text(
        self,
        request: TransactionParseRequest,
    ) -> TransactionParseResult:
        if not self.resolved_enabled:
            raise LlmProviderUnavailableError("LLM provider is disabled")

        payload = self._build_chat_payload(request)
        response_payload = await self._post_json("/api/chat", payload)
        content = _extract_message_content(response_payload)

        try:
            return TransactionParseResult.model_validate_json(content)
        except (ValidationError, ValueError) as error:
            raise LlmProviderInvalidResponseError() from error

    async def get_status(self) -> LlmProviderStatus:
        if not self.resolved_enabled:
            return LlmProviderStatus(
                provider_name="ollama",
                model_name=self.resolved_model_name,
                available=False,
                reason="disabled",
            )

        try:
            await self._get_json("/api/tags")
        except LlmProviderTimeoutError:
            return self._unavailable_status("timeout")
        except LlmProviderUnavailableError:
            return self._unavailable_status("unreachable")
        except LlmProviderError:
            return self._unavailable_status("unavailable")

        return LlmProviderStatus(
            provider_name="ollama",
            model_name=self.resolved_model_name,
            available=True,
            reason=None,
        )

    def _build_chat_payload(self, request: TransactionParseRequest) -> dict[str, Any]:
        return {
            "model": self.resolved_model_name,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"message: {request.message}\n"
                        f"locale: {request.locale}\n"
                        f"default_currency: {request.default_currency}\n"
                        f"timezone: {request.timezone}"
                    ),
                },
            ],
            "stream": False,
            "format": TransactionParseResult.model_json_schema(),
            "options": {"temperature": 0},
        }

    async def _get_json(self, path: str) -> dict[str, Any]:
        return await self._request_json("GET", path)

    async def _post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request_json("POST", path, json=payload)

    async def _request_json(
        self,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> dict[str, Any]:
        url = f"{self.resolved_base_url}{path}"
        try:
            if self.client is not None:
                response = await self.client.request(method, url, **kwargs)
            else:
                async with httpx.AsyncClient(
                    timeout=self.resolved_timeout_seconds
                ) as client:
                    response = await client.request(method, url, **kwargs)
        except httpx.TimeoutException as error:
            raise LlmProviderTimeoutError() from error
        except httpx.ConnectError as error:
            raise LlmProviderUnavailableError() from error
        except httpx.RequestError as error:
            raise LlmProviderError() from error

        if response.status_code < 200 or response.status_code >= 300:
            raise LlmProviderError("LLM provider returned an unsuccessful response")

        try:
            parsed = response.json()
        except json.JSONDecodeError as error:
            raise LlmProviderInvalidResponseError() from error

        if not isinstance(parsed, dict):
            raise LlmProviderInvalidResponseError()
        return parsed

    def _unavailable_status(self, reason: str) -> LlmProviderStatus:
        return LlmProviderStatus(
            provider_name="ollama",
            model_name=self.resolved_model_name,
            available=False,
            reason=reason,
        )


def _extract_message_content(payload: dict[str, Any]) -> str:
    message = payload.get("message")
    if not isinstance(message, dict):
        raise LlmProviderInvalidResponseError()

    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise LlmProviderInvalidResponseError()
    return content
