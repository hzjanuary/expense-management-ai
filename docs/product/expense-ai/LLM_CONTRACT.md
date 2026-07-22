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
- `budget_remaining`
- `spending_breakdown`
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
  "date_range_label": null,
  "needs_confirmation": false,
  "confidence": "high",
  "missing_fields": []
}
```

Expected enum values:

- `intent`: `create_transaction`, `query_spending`, `budget_remaining`, `spending_breakdown`, `set_budget`, `unknown`
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

Ollama adapter behavior:

- Disabled by default through `POCKET_LEDGER_OLLAMA_ENABLED=false`.
- Uses the local chat endpoint with `stream=false`.
- Sends `TransactionParseResult.model_json_schema()` through the Ollama `format` field.
- Uses `temperature=0`.
- Validates `message.content` with `TransactionParseResult` before returning it.
- Maps disabled/unreachable, timeout, and invalid structured output failures to normalized provider errors.
- Does not persist parse output or mutate ledger records.

Provider selection for API parsing:

- If `POCKET_LEDGER_OLLAMA_ENABLED=true`, the API uses the Ollama provider.
- If Ollama is disabled and `POCKET_LEDGER_ENVIRONMENT` is `local`, `test`, or `development`, the API may use the deterministic fake provider for local development and tests.
- If Ollama is disabled in production-like environments, the API reports provider unavailable instead of silently using fake output.

Parse draft API behavior:

- `POST /api/v1/ai/parse` returns a typed draft and, for confirmable create-transaction results, a `draft_id`.
- Returned drafts use `source = "ai_chat"`.
- Confirmable create-transaction drafts are persisted locally from US-304 onward.
- Unknown or unsupported input is returned without a confirmable draft.
- Relative date text such as `hôm nay` may remain unresolved; the API returns `occurred_at = null` until date resolution is implemented.
- The parse API must not call transaction creation command handlers.
- The parse API must not create transactions or update account balances.
- Unknown or unsupported input returns `intent = "unknown"`, low confidence, `needs_confirmation = true`, and no draft.
- Provider failures map to safe API errors without exposing raw model output.
- Ambiguous, incomplete, or invalid create-transaction output returns `needs_confirmation = true`, no `draft_id`, no draft, and a deterministic clarification message.
- Missing amount asks for `amount_minor`.
- Missing, invalid, or mismatched category asks for `category_slug`.
- Unknown intent asks the user to clarify intent.
- Complete and valid low-confidence drafts are persisted as pending drafts and still require explicit confirmation before ledger mutation.

Confirm draft API behavior:

- `POST /api/v1/ai/confirm` loads a stored pending draft by `draft_id`.
- Confirmation revalidates the stored draft using deterministic money, currency, transaction type, and category rules.
- Confirmation uses the same deterministic ledger mutation path as manual transactions, with `source = "ai_chat"`.
- Confirmation never calls the LLM provider.
- Confirmation creates exactly one transaction and stores `created_transaction_id` on the draft.
- Confirmed drafts cannot be confirmed again.
- Expired drafts are rejected.
- If a draft has no resolved `occurred_at`, confirmation time is used as the transaction timestamp.

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

- The LLM may classify a query intent and extract spending scope, category, and date range.
- The answer must be computed from local ledger records.
- The answer must not rely on provider-generated totals.
- Responses must include the amount and explicit date range when answering a query.
- Query classification uses `intent = "query_spending"`, `currency`, `date_range_label = "this_month"`, and an explicit `spending_scope`.
- `spending_scope = "total"` means total current-month expense and requires `category_slug = null`.
- `spending_scope = "category"` means current-month expense for one category and requires a valid resolved expense `category_slug`.
- Total examples such as `Tháng này tôi đã chi tổng cộng bao nhiêu?`, `Tôi đã tiêu bao nhiêu trong tháng này?`, `Tổng chi tháng này là bao nhiêu?`, `Kể từ đầu tháng đến nay, tôi đã tiêu bao nhiêu?`, `Ví của tôi đã giảm bao nhiêu vì các khoản chi trong tháng này?`, `Tổng số tiền đi ra trong tháng hiện tại là bao nhiêu?`, `Tôi đã mất bao nhiêu tiền cho các khoản chi từ đầu tháng?`, and `Chi phí cộng dồn trong tháng này là bao nhiêu?` map to `spending_scope = "total"` with `category_slug = null`.
- Absence of a category phrase must not automatically become a missing-category clarification when the message asks for aggregate, all, cumulative, wallet-decrease, money-out, or total spending.
- If the provider returns `intent = "query_spending"` but omits `spending_scope`, the backend resolves the scope from the original message before asking for clarification.
- Food query phrases such as `ăn uống`, `ăn ngoài`, `ẩm thực`, and `food` map to category `food`.
- Coffee query phrases such as `cà phê`, `cafe`, `coffee`, and `trà sữa` map to category `coffee`.
- Transport query phrases such as `xăng`, `đổ xăng`, `taxi`, and `grab` map to category `transport`.
- Category alias normalization is deterministic backend behavior; provider aliases or labels are normalized before repository lookup.
- Missing, invalid, or income-only categories should produce clarification rather than a fabricated total.
- Unknown category phrases must not be silently mapped to `other` for analytical queries.
- Unsupported date ranges should produce clarification.
- The backend computes `amount_minor` and `transaction_count` from non-deleted expense transactions only.

## Budget Remaining Query Rules

- The LLM may classify a budget remaining intent and extract category/date range.
- The answer must be computed from configured local budgets and local ledger records.
- The answer must not rely on provider-generated budget totals.
- For US-502, query classification uses `intent = "budget_remaining"`, a valid expense `category_slug`, `currency`, and `date_range_label = "this_month"`.
- Food budget phrases such as `tiền ăn`, `ăn uống`, `ăn ngoài`, and `food` map to category `food`.
- Missing, invalid, or income-only categories should produce clarification rather than a fabricated budget answer.
- Unsupported date ranges should produce clarification.
- Missing budget setup should return an explicit no-budget answer rather than fabricated values.
- The backend computes `spent_minor`, `remaining_minor`, `is_over_budget`, and `transaction_count` from configured budgets and non-deleted expense transactions only.

## Spending Breakdown Query Rules

- The LLM may classify a spending breakdown or top-category intent and extract date range.
- The answer must be computed from local ledger records.
- The answer must not rely on provider-generated category totals or provider-selected top category.
- For US-503, query classification uses `intent = "spending_breakdown"`, `currency`, and `date_range_label = "this_week"`.
- `this_week` uses the request timezone with Monday as the inclusive week start and the next Monday as the exclusive end.
- Missing or unsupported date ranges should produce clarification rather than a fabricated breakdown.
- The backend groups non-deleted expense transactions by category, computes category totals and percentages, and chooses the top category deterministically.
- Top category ordering is amount descending, transaction count descending, then category slug ascending.
- Income transactions, out-of-range transactions, soft-deleted transactions, and other currencies do not count.
