# US-201 Money And Category Domain Rules

## Status

planned

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

TBD.

