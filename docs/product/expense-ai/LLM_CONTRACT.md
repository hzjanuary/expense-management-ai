# Pocket Ledger AI LLM Contract

Source input: `docs/product/expense-ai/SPEC.md`

## Core Safety Rule

The LLM/SLM must never write to the database directly.

Allowed flow:

```text
User text
  -> LLM structured extraction
  -> schema validation
  -> business rule validation
  -> optional confirmation or clarification
  -> command handler
  -> database transaction
  -> recalculated dashboard totals
```

## Supported MVP Intents

- `create_transaction`
- `query_spending`
- `set_budget`
- `unknown`

Post-MVP intents:

- `update_transaction`
- `delete_transaction`
- `create_recurring_transaction`
- `import_transactions`
- `export_report`

## Structured Output Schema

Transaction parse output:

```json
{
  "intent": "create_transaction",
  "transaction_type": "expense",
  "amount_minor": 35000,
  "currency": "VND",
  "category_slug": "food",
  "description": "ăn trưa",
  "merchant": null,
  "occurred_at_text": "hôm nay",
  "occurred_at_iso": null,
  "needs_confirmation": false,
  "confidence": "high",
  "missing_fields": []
}
```

Expected enum values:

- `intent`: `create_transaction`, `query_spending`, `set_budget`, `unknown`
- `transaction_type`: `expense`, `income`, `transfer`
- `confidence`: `high`, `medium`, `low`

## Provider Interface Expectations

- Provider calls return structured JSON only.
- Provider errors are normalized before reaching application logic.
- Provider health/status is available to the API.
- Provider endpoint URL and model name are configurable.
- Provider timeout is configurable.
- Tests can use a fake provider.
- Ollama is the first MVP provider.
- llama.cpp-compatible providers may be added later behind the same interface.

Provider interface:

```python
class LlmProvider(Protocol):
    async def parse_transaction_text(
        self,
        request: TransactionParseRequest,
    ) -> TransactionParseResult:
        ...

    async def get_status(self) -> LlmProviderStatus:
        ...
```

`TransactionParseRequest` minimum fields:

- `message`
- `locale`, default `vi-VN`
- `default_currency`, default `VND`
- `timezone`, default `Asia/Ho_Chi_Minh`

`LlmProviderStatus` minimum fields:

- `provider_name`
- `model_name`
- `available`
- `reason`

Normalized provider errors:

- `LlmProviderError`
- `LlmProviderUnavailableError`
- `LlmProviderTimeoutError`
- `LlmProviderInvalidResponseError`

## Validation Rules

The backend must reject parsed output when:

- Amount is missing.
- Amount is zero or negative.
- Currency is unsupported.
- Category does not exist and cannot be mapped to `other` by explicit rule.
- Transaction type is unknown.
- Occurred date is invalid.
- Parsed intent is unsupported.
- Parsed output attempts to mutate more than one financial object without an explicit supported flow.

## Confirmation Rules

The app must ask for confirmation when:

- Confidence is low.
- Amount is ambiguous.
- Category is ambiguous.
- Date is ambiguous.
- Currency is not explicit and user default currency is unknown.
- User asks to edit/delete existing financial data.
- LLM output changes more than one financial object.

Confirmation example:

```text
Mình hiểu là bạn đã chi 35.000đ cho ăn trưa, mục Food, hôm nay. Ghi lại nhé?
```

Actions:

- Confirm.
- Edit.
- Cancel.

## Vietnamese Amount Parsing Rules

The system must support common Vietnamese shorthand:

| Input | amount_minor |
| --- | ---: |
| `35k` | 35000 |
| `35 nghìn` | 35000 |
| `35 ngàn` | 35000 |
| `1tr` | 1000000 |
| `1 triệu` | 1000000 |
| `1m` | 1000000 |

LLM output may extract the phrase, but final normalization must be deterministic in application code.

## Spending Query Rules

- The LLM may classify a query intent and extract category/date range.
- The answer must be computed from local ledger records.
- The answer must not rely on provider-generated totals.
- Responses must include the amount and explicit date range when answering a query.
