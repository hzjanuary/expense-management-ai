# US-602 Soft Delete Transaction

## Status

planned

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
- Deleted transaction can be included with explicit admin/debug query.
- Tests verify balance recalculation.

## Design Notes

- Commands: soft delete transaction.
- Queries: default and include-deleted transaction list.
- API: delete endpoint to be defined.
- Tables: transaction.
- Domain rules: no hard delete in MVP; totals exclude deleted records.
- UI surfaces: delete action and updated dashboard/history.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Soft-delete command and balance recalculation tests. |
| Integration | API delete/list/dashboard behavior. |
| E2E | UI delete flow when implemented. |
| Platform | Not required. |
| Release | Regression tests for deleted transaction exclusion. |

## Harness Delta

TBD.

## Evidence

TBD.

