# US-202 Manual Expense Creation

## Status

implemented

## Lane

high-risk

## Product Contract

Allow users to create validated manual expenses that decrease account balance and appear in history.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can create an expense through API.
- Expense decreases account balance.
- Expense appears as a transaction record in the database.
- Invalid amount is rejected.
- Invalid category is rejected or mapped to `other` by explicit rule.
- Integration tests verify database persistence and atomic balance updates.

## Design Notes

- Commands: create manual expense transaction.
- Queries: direct persistence verification in tests only; transaction listing is out of scope.
- API: `POST /api/v1/transactions`.
- Tables: `accounts`, `transactions`.
- Domain rules: expense decreases balance; category must be expense type.
- Category slugs remain deterministic domain definitions; no category table is created.
- UI surfaces: manual transaction flow is covered later by frontend stories.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Expense command validation and balance delta. |
| Integration | API creates persisted expense and updated balance. |
| E2E | Covered later by UI story. |
| Platform | Not required. |
| Release | Regression tests for invalid amount/category. |

## Harness Delta

US-202 adds manual expense mutation behavior behind the backend API:

- New persistence tables: `accounts` and `transactions`.
- New migration: `0002_create_accounts_and_transactions.py`.
- New API route: `POST /api/v1/transactions` for `type = "expense"` and `source = "manual"` only.
- New application command validates Money and expense category rules before mutation.
- Default account strategy uses `Cash Wallet`; the account is created when missing.
- Failed validation is proven not to mutate transaction rows or account balance.

Out of scope remained deferred: income creation, transaction listing, budget/dashboard behavior, AI providers, frontend, and chat flows.

## Evidence

Validation completed on 2026-07-11:

- `cd backend && .venv/bin/pytest` -> 58 passed.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us202-alembic.db .venv/bin/alembic upgrade head` -> passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us202-alembic.db .venv/bin/alembic downgrade base` -> passed.
- `cd backend && POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us202-alembic.db .venv/bin/alembic upgrade head` -> passed.
