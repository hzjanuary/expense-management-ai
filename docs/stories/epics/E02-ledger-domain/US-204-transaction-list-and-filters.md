# US-204 Transaction List And Filters

## Status

planned

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
- Soft-deleted transactions are excluded by default.
- Tests cover pagination and filters.

## Design Notes

- Commands: none.
- Queries: list transactions.
- API: `GET /api/v1/transactions`.
- Tables: transaction, category.
- Domain rules: default query excludes `deleted_at` records.
- UI surfaces: transaction history.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Filter parser/date range tests. |
| Integration | API filter and pagination tests. |
| E2E | Covered by later history UI story. |
| Platform | Not required. |
| Release | Soft-delete exclusion regression test. |

## Harness Delta

TBD.

## Evidence

TBD.

