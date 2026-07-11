# US-204 Transaction List And Filters

## Status

implemented

## Lane

high-risk

## Product Contract

Provide transaction history queries with filters while excluding soft-deleted records by default.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`

## Acceptance Criteria

- List supports month filter.
- List supports category filter.
- List supports type filter.
- List supports text search.
- List supports pagination.
- Soft-deleted transactions are excluded by default.
- Invalid filters are rejected deterministically.
- Endpoint is read-only and does not change balances.
- Tests cover ordering, pagination, filters, invalid filters, soft-delete exclusion, and read-only behavior.

## Design Notes

- Commands: none.
- Queries: list transactions.
- API: `GET /api/v1/transactions`.
- Tables: existing `transactions`; category slugs remain deterministic domain definitions.
- Domain rules: default query excludes `deleted_at` records.
- Results are ordered by `occurred_at DESC`, then `created_at DESC`, then `id DESC`.
- Unknown category slugs are rejected.
- Valid category/type combinations with no matching rows return an empty list.
- UI surfaces: transaction history is covered later by frontend stories.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Filter parser/date range tests. |
| Integration | API filter and pagination tests. |
| E2E | Covered by later history UI story. |
| Platform | Not required. |
| Release | Soft-delete exclusion regression test. |

## Harness Delta

US-204 adds read-only transaction history behavior:

- New route behavior: `GET /api/v1/transactions`.
- Supports `month`, `category`, `type`, `q`, `limit`, and `offset`.
- Uses strict month, category, type, limit, and offset validation.
- Excludes soft-deleted transactions by default.
- Computes `total` before pagination.
- Does not mutate accounts or transactions.
- No schema change or migration was required.

Out of scope remained deferred: dashboard summaries, budgets, AI providers, frontend, chat flows, deletion endpoints, and export.

## Evidence

Validation completed on 2026-07-11:

- `cd backend && .venv/bin/pytest` -> 82 passed.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- Alembic validation was not rerun because US-204 required no schema or migration changes.
