# US-402 Category Remaining Budget

## Status

implemented

## Lane

high-risk

## Product Contract

Show spent and remaining budget per category using computed totals from ledger transactions.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- API returns spent and remaining amount per category.
- Over-budget category is marked.
- Dedicated budget remaining endpoint returns computed totals.
- Income, soft-deleted, and out-of-month transactions do not count as spending.
- Total monthly expense includes all non-deleted monthly expenses, including unbudgeted categories.
- Endpoint is read-only and does not mutate budgets, transactions, accounts, or AI drafts.
- Tests cover under-budget, exact-budget, and over-budget states.

## Design Notes

- Commands: none.
- Queries: category budget summary.
- API: `GET /api/v1/budgets/monthly/{year}/{month}/remaining?currency=VND`.
- Tables: transaction, budget period, category budget.
- Domain rules: remaining equals budget minus non-deleted spent total.
- Dashboard summary remains stable; dashboard progress UI is not implemented in this story.
- UI surfaces: dashboard category spending list in a later frontend story.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Remaining-budget calculation tests passed through API integration coverage. |
| Integration | Budget remaining API returns budget states from persisted budget setup and transactions. |
| E2E | Not run; no frontend budget progress flow exists yet. |
| Platform | Not required. |
| Release | Deleted transactions excluded; income and out-of-month transactions excluded. |

## Harness Delta

- Added read-only budget remaining endpoint.
- Updated API/domain docs and test matrix for US-402 only.
- No migration was added.

## Evidence

- `cd backend && .venv/bin/pytest` - passed, 164 passed, 1 optional Ollama integration skipped.
- `cd backend && .venv/bin/ruff check .` - passed.
- `cd backend && .venv/bin/black --check .` - passed.
- `cd backend && .venv/bin/mypy app` - passed.
- `git diff --check` - passed.
- `scripts/bin/harness-cli query matrix` - US-402 marked implemented with unit/integration proof.
