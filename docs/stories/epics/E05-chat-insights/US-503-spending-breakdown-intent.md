# US-503 Spending Breakdown Intent

## Status

implemented

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
- API: `POST /api/v1/ai/query-spending-breakdown`.
- Tables: reads existing transaction, account, budget, and AI draft tables only for proof; no schema changes.
- Domain rules: excludes income, out-of-range, soft-deleted, and non-matching-currency transactions.
- Ordering: amount descending, transaction count descending, category slug ascending.
- Date range: `this_week` uses request timezone with Monday inclusive to next Monday exclusive.
- UI surfaces: not implemented in this backend story.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Grouped spending, percentage, empty result, and tie behavior tests. |
| Integration | Insight response from seeded ledger records and provider error mapping. |
| E2E | Not required for backend-only US-503. |
| Platform | Not required. |
| Release | Date-range fixture. |

## Harness Delta

- Added `spending_breakdown` provider intent classification.
- Added read-only backend endpoint for current-week spending breakdown.
- Added deterministic aggregation proof and no-mutation regression proof.
- No migration or frontend change.

## Evidence

- `cd backend && .venv/bin/pytest tests/test_ai_spending_breakdown_api.py` passed: 18 passed.
- `cd backend && .venv/bin/pytest` passed: 216 passed, 1 skipped.
- `cd backend && .venv/bin/ruff check .` passed.
- `cd backend && .venv/bin/black --check .` passed.
- `cd backend && .venv/bin/mypy app` passed.
