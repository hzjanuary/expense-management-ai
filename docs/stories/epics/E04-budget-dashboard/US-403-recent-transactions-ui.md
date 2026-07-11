# US-403 Recent Transactions UI

## Status

planned

## Lane

normal

## Product Contract

Display recent transactions in the dashboard/history UI after manual or chat-created records.

## Relevant Product Docs

- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/product/expense-ai/API_CONTRACT.md`

## Acceptance Criteria

- New transaction appears without page refresh.
- Transaction shows amount, category, description, and date.
- Expense is visually distinct from income.
- Empty state is displayed when no transactions exist.
- E2E test covers manual transaction creation.

## Design Notes

- Commands: create transaction via existing API.
- Queries: list recent transactions.
- API: `GET /api/v1/transactions`.
- Tables: none directly.
- Domain rules: UI does not compute authoritative balances.
- UI surfaces: recent transactions and history.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Formatting/component tests. |
| Integration | API client state update test. |
| E2E | Manual transaction appears in UI. |
| Platform | Browser responsive smoke check. |
| Release | Frontend lint/typecheck. |

## Harness Delta

TBD.

## Evidence

TBD.

