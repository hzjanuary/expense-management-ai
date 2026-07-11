# US-503 Spending Breakdown Intent

## Status

planned

## Lane

high-risk

## Product Contract

Answer top-spending-category questions with deterministic category totals and explicit date range.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can ask `Tuần này tôi tiêu nhiều nhất vào mục nào?`.
- App computes category totals from transactions.
- App returns top category and amount.
- Date range is explicit in response.
- Tests verify deterministic calculation.

## Design Notes

- Commands: none.
- Queries: grouped spending by category/date range.
- API: chat insight endpoint to be defined.
- Tables: transaction, category.
- Domain rules: excludes soft-deleted transactions and uses deterministic tie behavior.
- UI surfaces: chat insight answer.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Grouped spending and tie behavior tests. |
| Integration | Insight response from seeded ledger records. |
| E2E | Chat answer displays top category and range. |
| Platform | Not required. |
| Release | Date-range fixture. |

## Harness Delta

TBD.

## Evidence

TBD.
