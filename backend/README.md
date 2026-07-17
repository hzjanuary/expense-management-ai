# Pocket Ledger AI Backend

FastAPI backend for Pocket Ledger AI.

## Scope

Implemented:

- `GET /health`
- `GET /`
- typed settings
- request ID middleware
- JSON request logging
- async SQLAlchemy SQLite engine setup
- async session factory and FastAPI DB session dependency
- Alembic migration configuration
- empty initial infrastructure migration
- pure Money and Category domain primitives
- manual expense and income creation API
- transaction list API with filters and pagination
- dashboard summary API
- LLM provider interface and Ollama adapter
- AI parse draft API
- AI draft confirmation API
- AI query spending API
- AI query budget remaining API
- AI query spending breakdown API
- monthly budget setup API
- monthly budget remaining API
- transaction CSV/JSON export API
- account and transaction persistence tables
- AI transaction draft persistence table
- budget setup persistence tables

Not implemented yet:

- budget dashboard progress UI
- AI history clearing
- frontend

## Database

The backend uses async SQLAlchemy with SQLite for local-first MVP persistence.
US-103 added infrastructure only. US-202 adds `accounts` and `transactions`
for manual expense and income creation.

Default database URL:

```text
sqlite+aiosqlite:///./data/pocket_ledger.db
```

Override it with:

```bash
POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-test.db
```

## Setup

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
```

## Run

```bash
.venv/bin/uvicorn app.main:app --reload
```

Health check:

```bash
curl -i http://127.0.0.1:8000/health
```

Expected response body:

```json
{
  "status": "ok"
}
```

## Configuration

Settings are loaded from environment variables with the `POCKET_LEDGER_` prefix.

| Setting | Environment variable | Default |
| --- | --- | --- |
| app name | `POCKET_LEDGER_APP_NAME` | `Pocket Ledger AI` |
| environment | `POCKET_LEDGER_ENVIRONMENT` | `local` |
| log level | `POCKET_LEDGER_LOG_LEVEL` | `INFO` |
| default currency | `POCKET_LEDGER_DEFAULT_CURRENCY` | `VND` |
| database URL | `POCKET_LEDGER_DATABASE_URL` | `sqlite+aiosqlite:///./data/pocket_ledger.db` |
| default account name | `POCKET_LEDGER_DEFAULT_ACCOUNT_NAME` | `Cash Wallet` |
| default account opening balance | `POCKET_LEDGER_DEFAULT_ACCOUNT_OPENING_BALANCE_MINOR` | `0` |
| Ollama enabled | `POCKET_LEDGER_OLLAMA_ENABLED` | `false` |
| Ollama base URL | `POCKET_LEDGER_OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| Ollama model | `POCKET_LEDGER_OLLAMA_MODEL` | `qwen2.5:3b` |
| Ollama timeout seconds | `POCKET_LEDGER_OLLAMA_TIMEOUT_SECONDS` | `10` |
| AI draft TTL seconds | `POCKET_LEDGER_AI_DRAFT_TTL_SECONDS` | `900` |
| export max rows | `POCKET_LEDGER_EXPORT_MAX_ROWS` | `10000` |

## Manual Transaction API

```bash
curl -i -X POST http://127.0.0.1:8000/api/v1/transactions \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "expense",
    "amount_minor": 35000,
    "currency": "VND",
    "category_slug": "food",
    "description": "ăn trưa",
    "occurred_at": "2026-07-11T12:00:00+07:00",
    "source": "manual"
  }'
```

Manual transactions support `type = "expense"` or `type = "income"` with
`source = "manual"`.

List transactions:

```bash
curl -i 'http://127.0.0.1:8000/api/v1/transactions?month=2026-07&limit=20&offset=0'
```

Supported list filters: `month`, `category`, `type`, `q`, `limit`, and `offset`.

Export transactions:

```bash
curl -i 'http://127.0.0.1:8000/api/v1/transactions/export?format=csv&month=2026-07'
curl -i 'http://127.0.0.1:8000/api/v1/transactions/export?format=json&month=2026-07'
```

Export supports `format`, `month`, `category`, `type`, and `q` filters. CSV
and JSON use an explicit field allowlist and exclude soft-deleted transactions.

Dashboard summary:

```bash
curl -i 'http://127.0.0.1:8000/api/v1/dashboard/summary?month=2026-07'
```

Monthly budget setup:

```bash
curl -i -X PUT http://127.0.0.1:8000/api/v1/budgets/monthly/2026/7 \
  -H 'Content-Type: application/json' \
  -d '{
    "currency": "VND",
    "total_budget_minor": 5000000,
    "category_budgets": [
      {"category_slug": "food", "budget_minor": 2000000},
      {"category_slug": "transport", "budget_minor": 800000}
    ]
  }'
```

Read configured budget setup:

```bash
curl -i 'http://127.0.0.1:8000/api/v1/budgets/monthly/2026/7?currency=VND'
```

Budget setup stores configured totals only. Spent and remaining budget values
are not calculated by US-401.

Read computed budget remaining values:

```bash
curl -i 'http://127.0.0.1:8000/api/v1/budgets/monthly/2026/7/remaining?currency=VND'
```

Budget remaining values are computed from non-deleted monthly expense
transactions and are not persisted.

## LLM Providers

The Ollama adapter is disabled by default. `POST /api/v1/ai/parse` uses Ollama
when `POCKET_LEDGER_OLLAMA_ENABLED=true`; otherwise local/test/development
environments use the deterministic fake provider. Production-like environments
with Ollama disabled report provider unavailable.

Parse a draft without mutating the ledger:

```bash
curl -i -X POST http://127.0.0.1:8000/api/v1/ai/parse \
  -H 'Content-Type: application/json' \
  -d '{"message": "Hôm nay tôi tiêu 35k vào ăn trưa"}'
```

Confirm a stored AI draft:

```bash
curl -i -X POST http://127.0.0.1:8000/api/v1/ai/confirm \
  -H 'Content-Type: application/json' \
  -d '{"draft_id": "<draft_id>"}'
```

Confirmation revalidates the stored draft, creates exactly one ledger
transaction with `source = "ai_chat"`, and marks the draft confirmed.

Ask a spending question. The provider classifies the query, but the amount is
computed from persisted ledger records:

```bash
curl -i -X POST http://127.0.0.1:8000/api/v1/ai/query-spending \
  -H 'Content-Type: application/json' \
  -d '{"message": "Tháng này tôi ăn uống hết bao nhiêu?"}'
```

Ask a budget remaining question. The provider classifies the query, but the
remaining budget is computed from configured budgets and persisted transactions:

```bash
curl -i -X POST http://127.0.0.1:8000/api/v1/ai/query-budget-remaining \
  -H 'Content-Type: application/json' \
  -d '{"message": "Còn bao nhiêu tiền ăn tháng này?"}'
```

Ask a spending breakdown question. The provider classifies the query, but
category totals and top category are computed from persisted ledger records:

```bash
curl -i -X POST http://127.0.0.1:8000/api/v1/ai/query-spending-breakdown \
  -H 'Content-Type: application/json' \
  -d '{"message": "Tuần này tôi tiêu nhiều nhất vào mục nào?"}'
```

Normal tests use mocked HTTP behavior for Ollama. To opt into the real local
Ollama smoke test:

```bash
POCKET_LEDGER_RUN_OLLAMA_INTEGRATION=1 .venv/bin/pytest tests/test_ollama_provider.py
```

## Validate

```bash
.venv/bin/pytest
.venv/bin/ruff check .
.venv/bin/black --check .
.venv/bin/mypy app
```

## Migrations

```bash
POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-migration.db \
  .venv/bin/alembic current
POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-migration.db \
  .venv/bin/alembic upgrade head
POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-migration.db \
  .venv/bin/alembic downgrade base
POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-migration.db \
  .venv/bin/alembic upgrade head
```
