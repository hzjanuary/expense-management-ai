# US-501 Query Spending Intent

## Status

implemented

## Lane

high-risk

## Product Contract

Answer category spending questions from ledger totals rather than LLM guesses.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can ask `Tháng này tôi ăn uống hết bao nhiêu?`.
- App maps query to category/date range.
- App answers using database totals, not LLM guesses.
- Answer includes amount and date range.
- Tests verify the answer is based on ledger records.
- Income, other-category, out-of-range, and soft-deleted transactions are excluded.
- Endpoint is read-only and does not mutate transactions, accounts, budgets, or AI drafts.
- Provider unavailable, timeout, and invalid response errors are mapped safely.

## Design Notes

- Commands: none.
- Queries: spending total by category/date range.
- API: `POST /api/v1/ai/query-spending`.
- Tables: transaction reads only.
- Domain rules: LLM classifies; database computes.
- UI surfaces: none in US-501; frontend insight UI is out of scope.
- Supported date range in US-501: `this_month`.
- Food query phrases map to `food`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Intent extraction normalization and total calculation tests. |
| Integration | Insight response from seeded ledger records. |
| E2E | Not run; frontend insight UI is out of scope for US-501. |
| Platform | Not required. |
| Release | Fixture for Vietnamese spending question. |

## Harness Delta

- Added backend proof for US-501.
- Updated test matrix and durable Harness story row.

## Evidence

- `cd backend && .venv/bin/pytest tests/test_ai_query_spending_api.py` - passed.
- `cd backend && .venv/bin/pytest` - passed, `179 passed`, `1 skipped`.
- `cd backend && .venv/bin/ruff check .` - passed.
- `cd backend && .venv/bin/black --check .` - passed.
- `cd backend && .venv/bin/mypy app` - passed.
- No migration was added.
