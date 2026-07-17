# Pocket Ledger AI API Contract

Source input: `docs/product/expense-ai/SPEC.md`

## Principles

- Unknown request data is parsed at the API boundary.
- API handlers must not trust LLM JSON without schema and business validation.
- Financial mutation routes must call deterministic command handlers.
- API responses use integer minor-unit money fields.

## Health

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

## Create Manual Transaction

```http
POST /api/v1/transactions
```

Expense request:

```json
{
  "type": "expense",
  "amount_minor": 35000,
  "currency": "VND",
  "category_slug": "food",
  "description": "ăn trưa",
  "occurred_at": "2026-07-11T12:00:00+07:00",
  "source": "manual"
}
```

Income request:

```json
{
  "type": "income",
  "amount_minor": 10000000,
  "currency": "VND",
  "category_slug": "salary",
  "description": "lương tháng 7",
  "occurred_at": "2026-07-11T09:00:00+07:00",
  "source": "manual"
}
```

Response:

```json
{
  "id": "uuid",
  "type": "expense",
  "amount_minor": 35000,
  "currency": "VND",
  "category_slug": "food",
  "description": "ăn trưa",
  "occurred_at": "2026-07-11T12:00:00+07:00",
  "source": "manual"
}
```

## List Transactions

```http
GET /api/v1/transactions?month=2026-07&category=food&type=expense&q=trua&limit=20&offset=0
```

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "expense",
      "amount_minor": 35000,
      "currency": "VND",
      "category_slug": "food",
      "description": "ăn trưa",
      "merchant": null,
      "occurred_at": "2026-07-11T12:00:00+07:00",
      "source": "manual"
    }
  ],
  "limit": 20,
  "offset": 0,
  "total": 1
}
```

Rules:

- Supports month filter.
- Supports category filter.
- Supports type filter.
- Supports description and merchant search.
- Excludes soft-deleted transactions by default.
- Supports pagination with `limit` default `50`, minimum `1`, maximum `100`.
- Supports `offset` default `0`, minimum `0`.
- Returns `total` as total matching rows before pagination.
- Orders by `occurred_at DESC`, then `created_at DESC`, then `id DESC`.
- Unknown category slugs are rejected.
- Valid category/type combinations with no matching rows return an empty list.

## Export Transactions

```http
GET /api/v1/transactions/export?format=csv&month=2026-07&category=food&type=expense&q=trua
```

Supported query parameters:

- `format`: `csv` or `json`; defaults to `csv`.
- `month`: `YYYY-MM`.
- `category`: a valid category slug.
- `type`: `expense` or `income`.
- `q`: text search over description and merchant.

CSV response headers:

```text
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="pocket-ledger-transactions-<scope>.csv"
```

JSON response headers:

```text
Content-Type: application/json
Content-Disposition: attachment; filename="pocket-ledger-transactions-<scope>.json"
```

JSON response:

```json
{
  "exported_at": "2026-07-17T08:00:00+07:00",
  "filters": {
    "month": "2026-07",
    "category": "food",
    "type": "expense",
    "q": null
  },
  "count": 1,
  "transactions": [
    {
      "id": "uuid",
      "type": "expense",
      "amount_minor": 35000,
      "currency": "VND",
      "category_slug": "food",
      "description": "ăn trưa",
      "merchant": null,
      "occurred_at": "2026-07-11T12:00:00+07:00",
      "source": "manual",
      "created_at": "2026-07-11T12:01:00+07:00"
    }
  ]
}
```

Exported field allowlist:

- `id`
- `type`
- `amount_minor`
- `currency`
- `category_slug`
- `description`
- `merchant`
- `occurred_at`
- `source`
- `created_at`

Rules:

- Export is user-triggered only.
- Export reuses transaction list filter validation and text search behavior.
- Export returns all matching rows up to `POCKET_LEDGER_EXPORT_MAX_ROWS`.
- If matches exceed `POCKET_LEDGER_EXPORT_MAX_ROWS`, the API returns `413` and does not silently truncate.
- Export order matches transaction listing order: `occurred_at DESC`, `created_at DESC`, `id DESC`.
- Soft-deleted transactions are excluded.
- CSV includes a header row and uses UTF-8 without BOM.
- CSV values are RFC 4180 escaped through the CSV writer.
- CSV string cells beginning with `=`, `+`, `-`, or `@` are prefixed with a single quote to mitigate spreadsheet formula injection.
- JSON exports use the same field allowlist as CSV.
- Export does not include `deleted_at`, `raw_user_text`, `parser_confidence`, provider/model metadata, request IDs, or logs.
- Export does not create, update, or delete transactions, accounts, budgets, or AI draft rows.
- Export contents are not persisted or uploaded externally.

## Parse Chat Message

```http
POST /api/v1/ai/parse
```

Request:

```json
{
  "message": "Hôm nay tôi tiêu 35k vào ăn trưa"
}
```

Response:

```json
{
  "intent": "create_transaction",
  "draft_id": "uuid",
  "draft": {
    "type": "expense",
    "amount_minor": 35000,
    "currency": "VND",
    "category_slug": "food",
    "description": "ăn trưa",
    "merchant": null,
    "occurred_at": null,
    "source": "ai_chat"
  },
  "needs_confirmation": false,
  "confidence": "high",
  "missing_fields": [],
  "clarification": null
}
```

Clarification response:

```json
{
  "intent": "create_transaction",
  "draft_id": null,
  "draft": null,
  "needs_confirmation": true,
  "confidence": "low",
  "missing_fields": ["amount_minor"],
  "clarification": {
    "message": "Bạn muốn ghi khoản này với số tiền bao nhiêu?",
    "fields": ["amount_minor"]
  }
}
```

Unknown response:

```json
{
  "intent": "unknown",
  "draft_id": null,
  "draft": null,
  "needs_confirmation": true,
  "confidence": "low",
  "missing_fields": ["intent"],
  "clarification": {
    "message": "Mình chưa hiểu bạn muốn ghi giao dịch hay hỏi thông tin gì. Bạn có thể nói rõ hơn không?",
    "fields": ["intent"]
  }
}
```

Mutation rule:

- This route must not create or update ledger transactions.
- Confirmable `create_transaction` drafts are stored locally for explicit confirmation.
- Unknown or unsupported input does not create a confirmable draft.
- Incomplete or invalid provider drafts do not create a confirmable draft.
- Complete valid low-confidence drafts may create a pending draft, but still require explicit confirmation.

Rules:

- Request fields are `message`, optional `locale`, optional `default_currency`, and optional `timezone`.
- Empty messages and invalid default currencies are rejected with `422`.
- Provider output is validated against money, currency, transaction type, and category rules before a draft is returned.
- Invalid provider output returns a safe API error and does not expose raw model output.
- For US-303, relative date text such as `hôm nay` is not resolved; `occurred_at` may be `null`.
- From US-304 onward, confirmable create-transaction responses include `draft_id`.
- From US-305 onward, ambiguous or low-confidence responses include `clarification`.
- Missing amount asks for amount.
- Missing or invalid category asks for category.
- Category/type mismatch asks for category and does not persist a confirmable draft.
- Provider unavailable returns `503`.
- Provider timeout returns `504`.
- Invalid provider structured output returns `502`.
- Generic provider errors return `502`.

## Confirm AI Draft

```http
POST /api/v1/ai/confirm
```

Request:

```json
{
  "draft_id": "uuid"
}
```

Response:

```json
{
  "transaction": {
    "id": "uuid",
    "type": "expense",
    "amount_minor": 35000,
    "currency": "VND",
    "category_slug": "food",
    "description": "ăn trưa",
    "merchant": null,
    "occurred_at": "2026-07-15T10:00:00+07:00",
    "source": "ai_chat"
  },
  "account_balance_minor": 965000
}
```

Rules:

- A valid draft can be confirmed once.
- Expired or invalid drafts are rejected.
- Confirmation creates the transaction inside a database transaction.
- Confirmation never calls the LLM provider.
- Drafts are revalidated against money, currency, type, and category rules.
- If the stored draft has `occurred_at = null`, confirmation uses confirmation time as the transaction `occurred_at`.
- Confirmed transactions use `source = "ai_chat"`.
- Duplicate confirmation returns `422`.
- Missing drafts return `404`.

## Dashboard Summary

```http
GET /api/v1/dashboard/summary?month=2026-07
```

Response:

```json
{
  "currency": "VND",
  "total_balance_minor": 965000,
  "monthly_income_minor": 10000000,
  "monthly_expense_minor": 35000,
  "category_breakdown": [
    {
      "category_slug": "food",
      "type": "expense",
      "amount_minor": 35000
    },
    {
      "category_slug": "salary",
      "type": "income",
      "amount_minor": 10000000
    }
  ]
}
```

Rules:

- `month=YYYY-MM` is required.
- Invalid month format is rejected.
- `total_balance_minor` is computed from account current balances.
- Monthly income and expense values are computed from non-deleted transactions.
- Category totals are grouped by category slug and transaction type for the requested month.
- Category breakdown is ordered by type, amount descending, then category slug.
- No dashboard totals are stored.

## Monthly Budget Setup

```http
PUT /api/v1/budgets/monthly/{year}/{month}
```

Request:

```json
{
  "currency": "VND",
  "total_budget_minor": 5000000,
  "category_budgets": [
    {
      "category_slug": "food",
      "budget_minor": 2000000
    },
    {
      "category_slug": "transport",
      "budget_minor": 800000
    }
  ]
}
```

Response:

```json
{
  "year": 2026,
  "month": 7,
  "currency": "VND",
  "total_budget_minor": 5000000,
  "category_budgets": [
    {
      "category_slug": "food",
      "budget_minor": 2000000
    },
    {
      "category_slug": "transport",
      "budget_minor": 800000
    }
  ]
}
```

```http
GET /api/v1/budgets/monthly/{year}/{month}?currency=VND
```

Rules:

- Budget setup is scoped by year, month, and currency.
- Missing budget setup returns `404`.
- `year` must be between `1900` and `9999`.
- `month` must be between `1` and `12`.
- Budget amounts use integer minor units and may be zero.
- Float, string, and negative budget amounts are rejected.
- Category budget slugs must be valid expense categories.
- Income categories, unknown categories, and duplicate category slugs are rejected.
- Category budget totals cannot exceed the total monthly budget.
- Updating an existing budget replaces the submitted category budget list.
- Budget setup does not store spent or remaining values; remaining calculations belong to budget summary/progress stories.
- Budget setup must not mutate transactions or account balances.

## Monthly Budget Remaining

```http
GET /api/v1/budgets/monthly/{year}/{month}/remaining?currency=VND
```

Response:

```json
{
  "year": 2026,
  "month": 7,
  "currency": "VND",
  "total_budget_minor": 5000000,
  "total_expense_minor": 35000,
  "total_remaining_minor": 4965000,
  "categories": [
    {
      "category_slug": "food",
      "budget_minor": 2000000,
      "spent_minor": 35000,
      "remaining_minor": 1965000,
      "is_over_budget": false
    },
    {
      "category_slug": "transport",
      "budget_minor": 800000,
      "spent_minor": 0,
      "remaining_minor": 800000,
      "is_over_budget": false
    }
  ]
}
```

Rules:

- Missing budget setup returns `404`.
- Invalid year, month, or currency is rejected with `422`.
- `spent_minor` is computed from non-deleted expense transactions in the selected month.
- Income transactions, soft-deleted transactions, and transactions outside the selected month do not count as spending.
- `remaining_minor = budget_minor - spent_minor`.
- `is_over_budget = spent_minor > budget_minor`.
- `total_expense_minor` includes all non-deleted expense transactions in the selected month, including categories without configured category budgets.
- `total_remaining_minor = total_budget_minor - total_expense_minor`.
- The response returns configured category budgets only; unbudgeted categories are not invented.
- Categories are ordered by over-budget first, then spent descending, then category slug ascending.
- Spent and remaining totals are computed at read time and are not stored.
- Budget remaining reads must not mutate budgets, transactions, accounts, or AI draft rows.

## Query Spending

```http
POST /api/v1/ai/query-spending
```

Request:

```json
{
  "message": "Tháng này tôi ăn uống hết bao nhiêu?",
  "locale": "vi-VN",
  "currency": "VND",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

Response:

```json
{
  "intent": "query_spending",
  "category_slug": "food",
  "currency": "VND",
  "date_range": {
    "start": "2026-07-01T00:00:00+07:00",
    "end": "2026-08-01T00:00:00+07:00",
    "label": "this_month"
  },
  "amount_minor": 35000,
  "transaction_count": 1,
  "answer": "Tháng này bạn đã chi 35.000₫ cho food.",
  "needs_clarification": false,
  "clarification": null
}
```

Clarification response:

```json
{
  "intent": "query_spending",
  "category_slug": null,
  "currency": "VND",
  "date_range": null,
  "amount_minor": null,
  "transaction_count": 0,
  "answer": null,
  "needs_clarification": true,
  "clarification": {
    "message": "Bạn muốn hỏi chi tiêu cho danh mục nào?",
    "fields": ["category_slug"]
  }
}
```

Rules:

- The provider may classify intent, category, currency, and date range.
- The provider must not answer or invent totals.
- The API computes `amount_minor` and `transaction_count` from persisted ledger records.
- US-501 supports `date_range.label = "this_month"`.
- `this_month` uses the request timezone and spans the first instant of the current month inclusive to the first instant of the next month exclusive.
- Category must be a valid expense category.
- Income categories, unknown categories, and unsupported date ranges return a safe clarification response.
- Empty messages and invalid currency/timezone values are rejected with `422`.
- Provider unavailable returns `503`.
- Provider timeout returns `504`.
- Invalid provider structured output returns `502`.
- The endpoint counts only non-deleted expense transactions matching the category, currency, and date range.
- Income transactions, other categories, out-of-range transactions, and soft-deleted transactions do not count.
- The endpoint must not mutate transactions, accounts, budgets, or AI draft rows.

## Query Budget Remaining

```http
POST /api/v1/ai/query-budget-remaining
```

Request:

```json
{
  "message": "Còn bao nhiêu tiền ăn tháng này?",
  "locale": "vi-VN",
  "currency": "VND",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

Response:

```json
{
  "intent": "budget_remaining",
  "category_slug": "food",
  "currency": "VND",
  "date_range": {
    "start": "2026-07-01T00:00:00+07:00",
    "end": "2026-08-01T00:00:00+07:00",
    "label": "this_month"
  },
  "budget_minor": 2000000,
  "spent_minor": 35000,
  "remaining_minor": 1965000,
  "is_over_budget": false,
  "transaction_count": 1,
  "answer": "Tháng này bạn còn 1.965.000₫ cho food.",
  "needs_clarification": false,
  "clarification": null
}
```

No-budget response:

```json
{
  "intent": "budget_remaining",
  "category_slug": "food",
  "currency": "VND",
  "date_range": {
    "start": "2026-07-01T00:00:00+07:00",
    "end": "2026-08-01T00:00:00+07:00",
    "label": "this_month"
  },
  "budget_minor": null,
  "spent_minor": 35000,
  "remaining_minor": null,
  "is_over_budget": null,
  "transaction_count": 1,
  "answer": "Bạn chưa thiết lập ngân sách cho food tháng này.",
  "needs_clarification": false,
  "clarification": null
}
```

Rules:

- The provider may classify intent, category, currency, and date range.
- The provider must not answer or invent budget totals.
- The API computes `spent_minor`, `remaining_minor`, `is_over_budget`, and `transaction_count` from configured budget and ledger records.
- US-502 supports `date_range.label = "this_month"`.
- `this_month` uses the request timezone and spans the first instant of the current month inclusive to the first instant of the next month exclusive.
- Category must be a valid expense category.
- Income categories, unknown categories, and unsupported date ranges return a safe clarification response.
- Missing budget setup returns `200` with `budget_minor = null`, `remaining_minor = null`, and an explicit no-budget answer.
- Empty messages and invalid currency/timezone values are rejected with `422`.
- Provider unavailable returns `503`.
- Provider timeout returns `504`.
- Invalid provider structured output returns `502`.
- Spending counts only non-deleted expense transactions matching the category, currency, and date range.
- Income transactions, other categories, out-of-range transactions, and soft-deleted transactions do not count.
- The endpoint must not mutate transactions, accounts, budgets, or AI draft rows.

## Query Spending Breakdown

```http
POST /api/v1/ai/query-spending-breakdown
```

Request:

```json
{
  "message": "Tuần này tôi tiêu nhiều nhất vào mục nào?",
  "locale": "vi-VN",
  "currency": "VND",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

Response:

```json
{
  "intent": "spending_breakdown",
  "currency": "VND",
  "date_range": {
    "start": "2026-07-13T00:00:00+07:00",
    "end": "2026-07-20T00:00:00+07:00",
    "label": "this_week"
  },
  "total_expense_minor": 285000,
  "transaction_count": 5,
  "top_category": {
    "category_slug": "food",
    "amount_minor": 180000,
    "transaction_count": 3,
    "percentage": 63.16
  },
  "breakdown": [
    {
      "category_slug": "food",
      "amount_minor": 180000,
      "transaction_count": 3,
      "percentage": 63.16
    },
    {
      "category_slug": "transport",
      "amount_minor": 105000,
      "transaction_count": 2,
      "percentage": 36.84
    }
  ],
  "answer": "Tuần này bạn chi nhiều nhất cho food: 180.000₫.",
  "needs_clarification": false,
  "clarification": null
}
```

No-expense response:

```json
{
  "intent": "spending_breakdown",
  "currency": "VND",
  "date_range": {
    "start": "2026-07-13T00:00:00+07:00",
    "end": "2026-07-20T00:00:00+07:00",
    "label": "this_week"
  },
  "total_expense_minor": 0,
  "transaction_count": 0,
  "top_category": null,
  "breakdown": [],
  "answer": "Bạn chưa có khoản chi nào trong tuần này.",
  "needs_clarification": false,
  "clarification": null
}
```

Rules:

- The provider may classify intent, currency, and date range.
- The provider must not answer, invent category totals, or choose the top category.
- The API computes `total_expense_minor`, `transaction_count`, `top_category`, and `breakdown` from persisted ledger records.
- US-503 supports `date_range.label = "this_week"`.
- `this_week` uses the request timezone with Monday as the inclusive start and the next Monday as the exclusive end.
- The endpoint groups only non-deleted expense transactions matching currency and date range.
- Income transactions, out-of-range transactions, soft-deleted transactions, and other currencies do not count.
- Breakdown entries are ordered by amount descending, transaction count descending, then category slug ascending.
- Percentages are rounded to two decimal places.
- Unknown intent and unsupported or missing date ranges return a safe clarification response.
- Empty messages and invalid currency/timezone values are rejected with `422`.
- Provider unavailable returns `503`.
- Provider timeout returns `504`.
- Invalid provider structured output returns `502`.
- The endpoint must not mutate transactions, accounts, budgets, or AI draft rows.

## Provider Status

```http
GET /api/v1/ai/providers/status
```

Response:

```json
{
  "active_provider": "ollama",
  "active_model": "qwen2.5:3b",
  "available": true
}
```

Rules:

- The user must be able to see which provider/model is active.
- Unavailable local provider status is not a fatal application failure.
