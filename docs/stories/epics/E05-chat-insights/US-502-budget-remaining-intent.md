# US-502 Budget Remaining Intent

## Status

implemented

## Lane

high-risk

## Product Contract

Answer remaining-budget questions from configured budgets and ledger totals without fabricating missing data.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can ask `Còn bao nhiêu tiền ăn tháng này?`.
- App returns remaining food budget.
- App handles no budget configured.
- App does not fabricate budget data.
- Tests verify no-budget and budget-configured cases.
- Income, other-category, out-of-range, and soft-deleted transactions are excluded from spending.
- Over-budget state is computed.
- Endpoint is read-only and does not mutate transactions, accounts, budgets, or AI drafts.
- Provider unavailable, timeout, and invalid response errors are mapped safely.

## Design Notes

- Commands: none.
- Queries: remaining budget by category/month.
- API: `POST /api/v1/ai/query-budget-remaining`.
- Tables: transaction, budget period, category budget.
- Domain rules: missing budget returns explicit no-budget state.
- UI surfaces: none in US-502; frontend insight UI is out of scope.
- Supported date range in US-502: `this_month`.
- Food budget query phrases map to `food`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Remaining-budget and no-budget calculation tests. |
| Integration | Insight response for configured and missing budget fixtures. |
| E2E | Not run; frontend insight UI is out of scope for US-502. |
| Platform | Not required. |
| Release | No fabrication regression test. |

## Harness Delta

- Added backend proof for US-502.
- Updated test matrix and durable Harness story row.

## Evidence

- `cd backend && .venv/bin/pytest tests/test_ai_budget_remaining_api.py` - passed.
- `cd backend && .venv/bin/pytest` - passed, `198 passed`, `1 skipped`.
- `cd backend && .venv/bin/ruff check .` - passed.
- `cd backend && .venv/bin/black --check .` - passed.
- `cd backend && .venv/bin/mypy app` - passed.
- No migration was added.
