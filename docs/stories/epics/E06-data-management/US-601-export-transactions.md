# US-601 Export Transactions

## Status

implemented

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

- Commands: none; export is read-only.
- Queries: filtered transaction export query.
- API: `GET /api/v1/transactions/export`.
- Formats: `csv` and `json`.
- Tables: reads transaction rows; no schema changes.
- Domain rules: export uses explicit user action, filter scope, soft-delete exclusion, row limit, and field allowlist.
- UI surfaces: not implemented in this backend story.
- CSV safety: spreadsheet formula prefixes are single-quote escaped for string cells.
- Privacy: excludes internal/deleted/AI metadata fields.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | CSV/JSON serialization and row-limit behavior tests. |
| Integration | Export endpoint respects filters, fields, soft deletes, headers, and no-mutation guarantees. |
| E2E | Not required until frontend export UI exists. |
| Platform | Download headers covered at API level; browser-specific proof deferred. |
| Release | Privacy review of exported fields. |

## Harness Delta

- Added backend CSV/JSON export endpoint.
- Added typed `POCKET_LEDGER_EXPORT_MAX_ROWS`.
- Updated API and privacy contracts with field allowlist and safety rules.
- No migration, frontend, delete, auth, or cloud storage behavior added.

## Evidence

- `cd backend && .venv/bin/pytest tests/test_transaction_export_api.py` passed: 8 passed.
- `cd backend && .venv/bin/pytest` passed: 224 passed, 1 skipped.
- `cd backend && .venv/bin/ruff check .` passed.
- `cd backend && .venv/bin/black --check .` passed.
- `cd backend && .venv/bin/mypy app` passed.
