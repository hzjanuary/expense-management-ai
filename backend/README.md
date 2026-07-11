# Pocket Ledger AI Backend

Minimal FastAPI backend foundation for US-101.

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

Not implemented yet:

- product database tables
- transaction mutation behavior
- transactions
- budgets
- dashboard business logic
- AI provider integration

## Database

The backend uses async SQLAlchemy with SQLite for local-first MVP persistence.
US-103 adds infrastructure only; it does not create product domain tables.

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
