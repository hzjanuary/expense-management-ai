# US-203 Manual Income Creation

## Status

implemented

## Lane

high-risk

## Product Contract

Allow users to create validated manual income that increases account balance and appears in history.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can create income through API.
- Income increases account balance.
- Income appears as a transaction record in the database.
- Income category must be income type.
- Integration tests verify database persistence and atomic balance updates.

## Design Notes

- Commands: create manual transaction.
- Queries: direct persistence verification in tests only; transaction listing is out of scope.
- API: `POST /api/v1/transactions`.
- Tables: existing `accounts`, `transactions`.
- Domain rules: income increases balance; category must be income type.
- Category slugs remain deterministic domain definitions; no category table is created.
- UI surfaces: manual transaction flow is covered later by frontend stories.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Income command validation and balance delta. |
| Integration | API creates persisted income and updated balance. |
| E2E | Covered later by UI story. |
| Platform | Not required. |
| Release | Regression tests for category type mismatch. |

## Harness Delta

US-203 extends the US-202 manual transaction path:

- `POST /api/v1/transactions` now accepts `type = "income"` with `source = "manual"`.
- The application command validates Money and income category rules before mutation.
- Income increases `accounts.current_balance_minor`.
- Transaction creation and balance update remain in one database transaction.
- No schema change was required; existing `accounts` and `transactions` tables already supported income.
- Failed validation is proven not to mutate transaction rows or account balance.

Out of scope remained deferred: transaction list/filter APIs, budget/dashboard behavior, AI providers, frontend, chat flows, deletion, and export.

## Evidence

Validation completed on 2026-07-11:

- `cd backend && .venv/bin/pytest` -> 67 passed.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- Alembic validation was not rerun because US-203 required no schema or migration changes.
