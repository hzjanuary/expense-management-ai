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
- account and transaction persistence tables

Not implemented yet:

- budgets
- dashboard business logic
- AI provider integration
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
