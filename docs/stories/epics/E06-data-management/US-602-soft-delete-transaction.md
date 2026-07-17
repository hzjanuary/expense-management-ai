# US-602 Soft Delete Transaction

## Status

implemented

## Lane

high-risk

## Product Contract

Delete transactions by setting `deleted_at`, excluding them from default views and recalculating totals.

## Relevant Product Docs

- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/product/expense-ai/API_CONTRACT.md`

## Acceptance Criteria

- Delete marks transaction as deleted.
- Deleted transaction no longer appears in default list.
- Dashboard totals exclude deleted transactions.
- Balance reversal is atomic with soft-delete marking.
- Repeated delete is rejected and does not reverse balance twice.
- Tests verify balance recalculation and exclusion from list, dashboard, budget, insight, and export reads.

## Design Notes

- Commands: `SoftDeleteTransactionCommand`.
- Queries: default reads continue excluding soft-deleted records; no `include_deleted` user-facing query in US-602.
- API: `DELETE /api/v1/transactions/{transaction_id}`.
- Tables: updates existing `transactions.deleted_at` and `accounts.current_balance_minor`; no migration.
- Domain rules: no hard delete in MVP; expense deletion increases account balance; income deletion decreases account balance.
- AI draft rules: draft records referencing deleted AI-created transactions remain intact.
- UI surfaces: not implemented in this backend story.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Soft-delete command rollback and balance reversal tests. |
| Integration | API delete/list/dashboard/budget/insight/export behavior. |
| E2E | Not required until frontend delete UI exists. |
| Platform | Not required. |
| Release | Regression tests for deleted transaction exclusion. |

## Harness Delta

- Added deterministic soft-delete mutation path.
- Added structured delete API response.
- Added duplicate-delete protection and rollback proof.
- Updated API, domain, privacy, README, story, and test matrix docs.
- No migration, restore, hard-delete, frontend, AI-history, auth, or audit-log behavior added.

## Evidence

- `cd backend && .venv/bin/pytest tests/test_soft_delete_transaction_api.py` passed: 8 passed.
- `cd backend && .venv/bin/pytest` passed: 232 passed, 1 skipped.
- `cd backend && .venv/bin/ruff check .` passed.
- `cd backend && .venv/bin/black --check .` passed.
- `cd backend && .venv/bin/mypy app` passed.
