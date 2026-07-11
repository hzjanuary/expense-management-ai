# US-001 Create Product Contract

## Status

planned

## Lane

high-risk

## Product Contract

Convert the accepted new spec into stable product contract docs without changing the source `SPEC.md`.

## Relevant Product Docs

- `docs/product/expense-ai/SPEC.md`
- `docs/product/expense-ai/PRODUCT_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- Product docs exist under `docs/product/expense-ai/`.
- MVP scope, non-MVP scope, user goals, guarantees, and definition of done are documented.
- The example `Hôm nay tôi tiêu 35k vào ăn trưa` is included.
- The contract states that LLM output cannot directly write to the database.
- Product docs link to each other through the contract surface.

## Design Notes

- Commands: none.
- Queries: none.
- API: documented only.
- Tables: documented only.
- Domain rules: money, transactions, budgets, chat messages, and AI parse attempts.
- UI surfaces: dashboard, manual entry, chat entry, clarification, and spending query.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not required for documentation intake. |
| Integration | Not required for documentation intake. |
| E2E | Not required for documentation intake. |
| Platform | `git diff --check`. |
| Release | Product docs reviewed for internal consistency. |

## Harness Delta

Creates the initial living product contract for the expense AI product.

## Evidence

Add validation output after Phase 0 validation runs.
