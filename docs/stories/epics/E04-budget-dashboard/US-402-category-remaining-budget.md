# US-402 Category Remaining Budget

## Status

planned

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
- Dashboard displays budget progress.
- Tests cover under-budget, exact-budget, and over-budget states.

## Design Notes

- Commands: none.
- Queries: category budget summary.
- API: dashboard summary category breakdown.
- Tables: transaction, budget period, category budget.
- Domain rules: remaining equals budget minus non-deleted spent total.
- UI surfaces: dashboard category spending list.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Remaining-budget calculation tests. |
| Integration | Dashboard API returns budget states. |
| E2E | Dashboard displays under/exact/over budget states. |
| Platform | Not required. |
| Release | Deleted transactions excluded. |

## Harness Delta

TBD.

## Evidence

TBD.

