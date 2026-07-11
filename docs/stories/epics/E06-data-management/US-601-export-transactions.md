# US-601 Export Transactions

## Status

planned

## Lane

high-risk

## Product Contract

Allow explicit user-triggered export of local transaction data as CSV and JSON.

## Relevant Product Docs

- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`

## Acceptance Criteria

- User can export CSV.
- User can export JSON.
- Export respects filters.
- Export is user-triggered only.
- Tests verify exported fields.

## Design Notes

- Commands: export transactions.
- Queries: filtered transaction export query.
- API: export endpoint to be defined.
- Tables: transaction, category, account.
- Domain rules: export uses explicit user action and filter scope.
- UI surfaces: export action.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | CSV/JSON serialization tests. |
| Integration | Export endpoint respects filters and fields. |
| E2E | User-triggered export flow when UI exists. |
| Platform | File download behavior if browser-specific. |
| Release | Privacy review of exported fields. |

## Harness Delta

TBD.

## Evidence

TBD.

