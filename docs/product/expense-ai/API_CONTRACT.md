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
  "draft": {
    "type": "expense",
    "amount_minor": 35000,
    "currency": "VND",
    "category_slug": "food",
    "description": "ăn trưa",
    "occurred_at": "2026-07-11T12:00:00+07:00"
  },
  "needs_confirmation": false,
  "confidence": "high"
}
```

Mutation rule:

- This route must not create or update ledger transactions.

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
  "transaction_id": "uuid",
  "balance_minor": 965000,
  "monthly_food_spent_minor": 35000
}
```

Rules:

- A valid draft can be confirmed once.
- Expired or invalid drafts are rejected.
- Confirmation creates the transaction inside a database transaction.

## Dashboard Summary

```http
GET /api/v1/dashboard/summary?month=2026-07
```

Response:

```json
{
  "currency": "VND",
  "total_balance_minor": 965000,
  "monthly_income_minor": 0,
  "monthly_expense_minor": 35000,
  "category_breakdown": [
    {
      "category_slug": "food",
      "spent_minor": 35000,
      "budget_minor": 2000000,
      "remaining_minor": 1965000
    }
  ]
}
```

Rules:

- Values are computed from non-deleted transactions.
- Category totals are grouped by the requested month.

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
