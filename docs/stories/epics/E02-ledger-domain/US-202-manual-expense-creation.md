# US-202 Manual Expense Creation

## Status

planned

## Lane

high-risk

## Product Contract

Allow users to create validated manual expenses that decrease account balance and appear in history.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can create an expense through API.
- Expense decreases account balance.
- Expense appears in transaction history.
- Invalid amount is rejected.
- Invalid category is rejected or mapped to `other` by explicit rule.
- Integration tests verify database persistence.

## Design Notes

- Commands: create manual transaction.
- Queries: transaction history.
- API: `POST /api/v1/transactions`.
- Tables: account, category, transaction.
- Domain rules: expense decreases balance; category must be expense type.
- UI surfaces: manual transaction flow.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Expense command validation and balance delta. |
| Integration | API creates persisted expense and updated balance. |
| E2E | Covered later by UI story. |
| Platform | Not required. |
| Release | Regression tests for invalid amount/category. |

## Harness Delta

TBD.

## Evidence

TBD.

