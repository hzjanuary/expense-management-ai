# US-103 Local Database Setup

## Status

implemented

## Lane

high-risk

## Product Contract

Create local SQLite persistence and migrations without adding unvalidated domain behavior.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/decisions/0001-local-first-stack.md`

## Acceptance Criteria

- SQLite database works locally.
- SQLAlchemy models are connected.
- Alembic migrations run from base to head.
- Test database uses isolated temporary DB.
- No domain table is created without migration coverage.

## Design Notes

- Commands: migration commands only.
- Queries: database connectivity check.
- API: none.
- Tables: account, category, transaction, budget, chat, and parse-attempt tables will be introduced in later scoped stories unless this story only wires migration foundation.
- Domain rules: schema must preserve integer money fields and soft-delete support.
- UI surfaces: none.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Settings/path tests for local and test database. |
| Integration | Migration base-to-head against temporary SQLite DB. |
| E2E | Not required. |
| Platform | Local database file creation path verified. |
| Release | Alembic consistency check once configured. |

## Harness Delta

Keep database proof expectations in `docs/TEST_MATRIX.md`.

## Evidence

- `cd backend && .venv/bin/python -m pip install -e ".[dev]"`: completed with `aiosqlite`, `SQLAlchemy`, and `Alembic` installed.
- `cd backend && .venv/bin/pytest`: 10 passed, 1 third-party deprecation warning from FastAPI/Starlette TestClient.
- `cd backend && .venv/bin/ruff check .`: passed.
- `cd backend && .venv/bin/black --check .`: passed.
- `cd backend && .venv/bin/mypy app`: passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us103-alembic.db .venv/bin/alembic current`: passed against isolated temp SQLite DB.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us103-alembic.db .venv/bin/alembic upgrade head`: passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us103-alembic.db .venv/bin/alembic downgrade base`: passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us103-alembic.db .venv/bin/alembic upgrade head`: passed.
- Temp migration DB inspection showed only `alembic_version`; no Account, Category, Transaction, Budget, or AI tables were created.
- `curl -i http://127.0.0.1:8011/health`: returned HTTP 200 with body `{"status":"ok"}` and an `X-Request-ID` response header after DB infrastructure was added.
