# US-205 Dashboard Summary

## Status

planned

## Lane

high-risk

## Product Contract

Compute dashboard balance, income, expense, and category totals from non-deleted ledger records.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- Dashboard summary returns balance.
- Dashboard summary returns monthly income.
- Dashboard summary returns monthly expenses.
- Dashboard summary returns category breakdown.
- Values are computed from transaction records.
- Tests cover expense/income/category totals.

## Design Notes

- Commands: none.
- Queries: dashboard summary by month.
- API: `GET /api/v1/dashboard/summary`.
- Tables: account, transaction, category, budget.
- Domain rules: computed totals exclude soft-deleted transactions.
- UI surfaces: dashboard.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Summary calculation tests. |
| Integration | API returns computed totals from fixtures. |
| E2E | Covered by dashboard UI stories. |
| Platform | Not required. |
| Release | Regression tests for deleted transaction exclusion. |

## Harness Delta

TBD.

## Evidence

TBD.

