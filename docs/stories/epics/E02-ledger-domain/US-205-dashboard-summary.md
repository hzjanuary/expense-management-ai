# US-205 Dashboard Summary

## Status

implemented

## Lane

high-risk

## Product Contract

Compute dashboard balance, income, expense, and category totals from non-deleted ledger records.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- Dashboard summary returns balance.
- Dashboard summary returns monthly income.
- Dashboard summary returns monthly expenses.
- Dashboard summary returns category breakdown.
- Values are computed from transaction records.
- Soft-deleted transactions are excluded.
- Invalid month is rejected deterministically.
- Endpoint is read-only and does not change balances.
- Tests cover balance, expense, income, category totals, date filtering, deleted transaction exclusion, invalid month, and read-only behavior.

## Design Notes

- Commands: none.
- Queries: dashboard summary by month.
- API: `GET /api/v1/dashboard/summary`.
- Tables: existing `accounts`, `transactions`.
- Domain rules: computed totals exclude soft-deleted transactions.
- Category slugs remain deterministic domain definitions; no category or budget tables are created.
- UI surfaces: dashboard is covered later by frontend stories.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Summary calculation tests. |
| Integration | API returns computed totals from fixtures. |
| E2E | Covered by dashboard UI stories. |
| Platform | Not required. |
| Release | Regression tests for deleted transaction exclusion. |

## Harness Delta

US-205 adds a read-only dashboard summary:

- New route: `GET /api/v1/dashboard/summary?month=YYYY-MM`.
- Computes total account balance from account current balances.
- Computes monthly income and expense totals from non-deleted transactions in the requested month.
- Groups category breakdown by category slug and transaction type.
- Orders category breakdown by type, amount descending, then category slug.
- Requires an explicit `month` query parameter and rejects invalid month format.
- Does not store derived totals.
- No schema change or migration was required.

Out of scope remained deferred: budgets, AI providers, frontend, chat flows, delete endpoints, export, and spending insight intents.

## Evidence

Validation completed on 2026-07-14:

- `cd backend && .venv/bin/pytest` -> 90 passed.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- Alembic validation was not rerun because US-205 required no schema or migration changes.
