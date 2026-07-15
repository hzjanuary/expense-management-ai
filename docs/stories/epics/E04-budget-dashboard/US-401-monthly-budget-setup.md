# US-401 Monthly Budget Setup

## Status

implemented

## Lane

high-risk

## Product Contract

Allow users to set total and category monthly budgets using validated integer minor-unit money.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can set total monthly budget.
- User can set category budget.
- Budget is currency-scoped.
- Invalid negative budget is rejected.
- Float and string budget amounts are rejected.
- Income, unknown, and duplicate category budgets are rejected.
- Category budget totals cannot exceed total monthly budget.
- Existing category budgets omitted from an update are removed.
- Budget setup does not mutate transactions or account balances.
- Tests cover budget creation and updates.

## Design Notes

- Commands: set monthly budget and category budget.
- Queries: budget lookup by month/category.
- API: `PUT /api/v1/budgets/monthly/{year}/{month}` and
  `GET /api/v1/budgets/monthly/{year}/{month}?currency=VND`.
- Tables: budget period, category budget.
- Domain rules: budgets use integer minor units and non-negative amounts.
- Missing budget setup returns `404`.
- UI surfaces: budget settings, not implemented in this story.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Budget validation and update tests passed. |
| Integration | API/database tests for create/update/get and no-mutation behavior passed. |
| E2E | Not run; no frontend budget settings flow exists yet. |
| Platform | Not required. |
| Release | Currency-scope regression tests passed. |

## Harness Delta

- Added US-401 budget setup persistence and API.
- Added budget setup migration `0004_create_budget_tables.py`.
- Updated API/domain docs and test matrix for US-401 only.

## Evidence

- `cd backend && .venv/bin/pytest` - passed, 158 passed, 1 optional Ollama integration skipped.
- `cd backend && .venv/bin/ruff check .` - passed.
- `cd backend && .venv/bin/black --check .` - passed.
- `cd backend && .venv/bin/mypy app` - passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us401-alembic.db .venv/bin/alembic current` - passed, `0004 (head)` after upgrade.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us401-alembic.db .venv/bin/alembic upgrade head` - passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us401-alembic.db .venv/bin/alembic downgrade base` - passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us401-alembic.db .venv/bin/alembic upgrade head` - passed.
