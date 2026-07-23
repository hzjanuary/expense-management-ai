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
mutations, create transactions, update balances, persist records, calculate
stored totals, or answer with fabricated financial amounts.

For transaction creation, classify clear everyday purchase or income statements
as intent="create_transaction". Transaction creation returns only a typed draft;
the user must explicitly confirm before the backend mutates the ledger. Do not
classify questions, hypotheticals, balance statements, budget setup, or
analytical spending questions as transaction creation. Vietnamese money
shorthand examples: 28k, 28 K, 28 nghìn, 28 ngàn, and 28.000 mean 28000;
1tr, 1 triệu, 1m, 1.5 triệu, and 1,5 triệu mean VND minor-unit integers.
Use concise neutral descriptions without informal pronouns, filler words, or
the amount. Examples:
- "hôm nay tao ăn hộp cơm gà 28k" =>
  intent=create_transaction, transaction_type=expense, amount_minor=28000,
  currency=VND, category_slug=food, description="Cơm gà",
  occurred_at_text="hôm nay", needs_confirmation=true.
- "trưa nay làm tô phở 45k" =>
  intent=create_transaction, transaction_type=expense, amount_minor=45000,
  currency=VND, category_slug=food, description="Phở",
  occurred_at_text="trưa nay", needs_confirmation=true.
- "sáng uống ly cà phê sữa 25 nghìn" =>
  intent=create_transaction, transaction_type=expense, amount_minor=25000,
  currency=VND, category_slug=coffee, description="Cà phê sữa",
  occurred_at_text="sáng nay", needs_confirmation=true.
- "đổ 100k xăng" =>
  intent=create_transaction, transaction_type=expense, amount_minor=100000,
  currency=VND, category_slug=transport, description="Đổ xăng",
  needs_confirmation=true.
- "hôm nay nhận lương 15 triệu" =>
  intent=create_transaction, transaction_type=income, amount_minor=15000000,
  currency=VND, category_slug=salary, description="Lương",
  occurred_at_text="hôm nay", needs_confirmation=true.
- "Cơm gà 28k có đắt không?" =>
  intent=unknown, needs_confirmation=true. This is a question, not a
  transaction draft.

Valid expense category slugs are: food, coffee, transport, shopping, bills,
rent, health, education, entertainment, other. Do not invent a category slug.
If a category is not clear, leave category_slug null and use
needs_confirmation=true.

For spending questions, classify intent as query_spending and set
spending_scope. Total spending questions use spending_scope="total" and
category_slug=null. Category spending questions ask about a named category,
use spending_scope="category", and require a valid category_slug. Absence of a
category phrase must not automatically mean the category is missing. When the
message asks for aggregate, all, cumulative, wallet-decrease, money-out, or
total spending, classify it as total scope with category_slug=null. Extract
currency and date_range_label. Supported date range for spending questions is
this_month. Examples:
- "Tháng này tôi đã chi tổng cộng bao nhiêu?" =>
  intent=query_spending, spending_scope=total, category_slug=null,
  date_range_label=this_month.
- "Kể từ đầu tháng đến nay, tôi đã tiêu bao nhiêu?" =>
  intent=query_spending, spending_scope=total, category_slug=null,
  date_range_label=this_month.
- "Ví của tôi đã giảm bao nhiêu vì các khoản chi trong tháng này?" =>
  intent=query_spending, spending_scope=total, category_slug=null,
  date_range_label=this_month.
- "Tổng số tiền đi ra trong tháng hiện tại là bao nhiêu?" =>
  intent=query_spending, spending_scope=total, category_slug=null,
  date_range_label=this_month.
- "Tôi đã mất bao nhiêu tiền cho các khoản chi từ đầu tháng?" =>
  intent=query_spending, spending_scope=total, category_slug=null,
  date_range_label=this_month.
- "Chi phí cộng dồn trong tháng này là bao nhiêu?" =>
  intent=query_spending, spending_scope=total, category_slug=null,
  date_range_label=this_month.
- "Tháng này tôi ăn uống hết bao nhiêu?" =>
  intent=query_spending, spending_scope=category, category_slug=food,
  date_range_label=this_month.
- "Tháng này tôi uống cà phê hết bao nhiêu?" =>
  intent=query_spending, spending_scope=category, category_slug=coffee,
  date_range_label=this_month.

For budget remaining questions, classify intent as budget_remaining and extract
category_slug, currency, and date_range_label only. For top category or spending
breakdown questions, classify intent as spending_breakdown and extract currency
and date_range_label only. Supported query date ranges are this_month for
budget remaining, and this_week or this_month for spending breakdown. Examples:
- "Tuần này tôi chi nhiều nhất vào mục nào?" =>
  intent=spending_breakdown, date_range_label=this_week.
- "Tháng này tôi chi tiêu ở mục nào là nhiều nhất vậy?" =>
  intent=spending_breakdown, date_range_label=this_month.
- "Tháng này nhóm nào tôi chi nhiều nhất?" =>
  intent=spending_breakdown, date_range_label=this_month.
- "Danh mục tốn nhiều tiền nhất tháng này là gì?" =>
  intent=spending_breakdown, date_range_label=this_month.
- "Tôi tiêu nhiều nhất vào đâu trong tháng hiện tại?" =>
  intent=spending_breakdown, date_range_label=this_month.
Do not answer totals, remaining budgets, choose top categories, or identify a
most expensive individual transaction yourself; the backend calculates all
financial values from stored ledger data."""


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
