# US-203 Manual Income Creation

## Status

planned

## Lane

high-risk

## Product Contract

Allow users to create validated manual income that increases account balance and appears in history.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can create income through API.
- Income increases account balance.
- Income appears in transaction history.
- Income category must be income type.
- Integration tests verify balance update.

## Design Notes

- Commands: create manual transaction.
- Queries: transaction history.
- API: `POST /api/v1/transactions`.
- Tables: account, category, transaction.
- Domain rules: income increases balance; category must be income type.
- UI surfaces: manual transaction flow.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Income command validation and balance delta. |
| Integration | API creates persisted income and updated balance. |
| E2E | Covered later by UI story. |
| Platform | Not required. |
| Release | Regression tests for category type mismatch. |

## Harness Delta

TBD.

## Evidence

TBD.

