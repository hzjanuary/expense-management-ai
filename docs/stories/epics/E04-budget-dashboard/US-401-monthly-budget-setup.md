# US-401 Monthly Budget Setup

## Status

planned

## Lane

high-risk

## Product Contract

Allow users to set total and category monthly budgets using validated integer minor-unit money.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can set total monthly budget.
- User can set category budget.
- Budget is currency-scoped.
- Invalid negative budget is rejected.
- Tests cover budget creation and updates.

## Design Notes

- Commands: set monthly budget and category budget.
- Queries: budget lookup by month/category.
- API: budget endpoints to be defined during implementation.
- Tables: budget period, category budget.
- Domain rules: budgets use integer minor units and non-negative amounts.
- UI surfaces: budget settings.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Budget validation and update tests. |
| Integration | API/database tests for create/update. |
| E2E | Budget settings flow when UI exists. |
| Platform | Not required. |
| Release | Currency-scope regression tests. |

## Harness Delta

TBD.

## Evidence

TBD.

