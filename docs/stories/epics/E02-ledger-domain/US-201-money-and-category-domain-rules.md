# US-201 Money And Category Domain Rules

## Status

implemented

## Lane

high-risk

## Product Contract

Enforce integer money, supported currency, and seeded categories before ledger mutations exist.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/PRODUCT_CONTRACT.md`

## Acceptance Criteria

- Money uses integer minor units only.
- Float amounts are rejected.
- Default VND currency exists.
- Default categories are seeded.
- Unit tests cover amount validation and category lookup.

## Design Notes

- Commands: category seed command.
- Queries: category lookup by slug/type.
- API: none directly.
- Tables: category.
- Domain rules: positive integer minor units; category type must match usage.
- UI surfaces: category labels used by forms and dashboard.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Money validation and category lookup tests. |
| Integration | Seeded categories exist in test DB. |
| E2E | Not required. |
| Platform | Not required. |
| Release | Lint/type checks. |

## Harness Delta

TBD.

## Evidence

- `cd backend && .venv/bin/pytest`: 48 passed, 1 third-party deprecation warning from FastAPI/Starlette TestClient.
- `cd backend && .venv/bin/ruff check .`: passed.
- `cd backend && .venv/bin/black --check .`: passed.
- `cd backend && .venv/bin/mypy app`: passed.
- Money tests cover integer minor units, positive transaction amounts, float/string/bool rejection, invalid currency rejection, uppercase currency normalization, default `VND`, and simple formatting.
- Category tests cover stable default expense/income slugs, deterministic lookup, transaction/category type enforcement, explicit unknown-category fallback helpers, and wrong-type fallback rejection.
- Vietnamese amount normalization tests cover `35k`, `35 nghìn`, `35 ngàn`, `1tr`, `1 triệu`, and `1m` as standalone deterministic amount fragments.
- No database schema, transaction API, account balance, budget, dashboard, AI provider, frontend, or chat behavior was added.
