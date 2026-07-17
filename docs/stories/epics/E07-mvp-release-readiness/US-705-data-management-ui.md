# US-705 Data Management UI

## Status

planned

## Lane

high-risk

## Product Contract

Add user-triggered data management controls for export, transaction soft delete,
and clear AI history without adding hard delete, restore, bulk delete, or auth.

## Relevant Product Docs

- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Dependencies

- US-601 Export Transactions.
- US-602 Soft Delete Transaction.
- US-603 Clear AI History.
- US-702 Live Dashboard Data Integration.
- US-703 Budget Setup And Progress UI.

## Acceptance Criteria

- User can trigger CSV export.
- User can trigger JSON export.
- User can soft-delete a transaction after explicit confirmation.
- UI explains that soft delete reverses balance effect and hides the row from default views.
- Dashboard, transaction list, budget remaining, and insights refresh after deletion.
- User can clear AI history after explicit confirmation.
- UI explains that clearing AI history does not delete ledger transactions.
- No hard delete, restore, bulk delete, or auth is added.

## Design Notes

- Commands: export trigger, soft delete transaction, clear AI history.
- Queries: refresh transaction list, dashboard, budget remaining, and insights.
- API: `GET /api/v1/transactions/export`, `DELETE /api/v1/transactions/{transaction_id}`, `DELETE /api/v1/ai/history`.
- Tables: existing transaction and AI draft/history tables only through backend APIs.
- Domain rules: all financial mutation remains backend-owned.
- UI surfaces: data management panel/actions, delete confirmation, clear-history confirmation, export controls.

## Explicit Out Of Scope

- Hard delete.
- Restore.
- Bulk delete.
- Authentication or authorization.
- AI history scheduling.
- Cloud storage or uploads.
- Export UI beyond CSV/JSON user-triggered download.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Component tests for confirmation dialogs, error states, and action callbacks. |
| Integration | Export/delete/clear-history API calls with typed success and error handling. |
| E2E | Demo exports, soft-deletes, refreshes views, and clears AI history. |
| Platform | Browser download/confirmation smoke where feasible. |
| Release | Privacy text and no hard-delete behavior verified. |

## Harness Delta

Add data management UI proof to release readiness matrix when implemented.

## Evidence

TBD.

