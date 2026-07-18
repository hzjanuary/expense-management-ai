# US-705 Data Management UI

## Status

implemented

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

- Frontend implementation:
  - Added same-origin proxies for `GET /api/transactions/export`,
    `DELETE /api/transactions/{transactionId}`, and `DELETE /api/ai/history`.
  - Added typed data-management client helpers for export URL construction,
    soft-delete responses, clear-history responses, and safe API errors.
  - Added dashboard data-management UI for CSV/JSON exports and clear AI
    history.
  - Added per-row Recent Transactions soft-delete action with explicit
    confirmation and no optimistic removal.
  - Soft-delete success triggers the existing dashboard-wide refresh callback so
    recent transactions, dashboard summary, budget progress, and insight
    staleness behavior refresh through the existing US-702/US-704 mechanism.
- Component/proxy proof:
  - `npm ci`
  - `npm test` passed: 9 files, 49 tests.
  - Tests cover export URL/filter behavior, Blob download and URL revocation,
    export errors, explicit soft-delete confirmation, duplicate/missing delete
    handling, clear-history confirmation/results, no automatic export, no AI
    endpoint call during clear history, and proxy allowlists/no-store behavior.
- Frontend quality gates:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run build` passed.
- Backend regression:
  - `cd backend && .venv/bin/pytest` passed: 238 passed, 1 skipped.
  - No backend files were changed.
- Runtime proof:
  - `docker compose up -d --build` built backend and frontend images and both
    services became healthy.
  - CSV export through frontend proxy returned `HTTP 200`,
    `Content-Type: text/csv; charset=utf-8`, attachment filename, and allowlisted
    transaction rows.
  - JSON export through frontend proxy returned `HTTP 200`,
    `Content-Type: application/json`, attachment filename, and allowlisted JSON
    rows.
  - Controlled transaction `4efa1ad0-87cd-428c-a605-41d026c9c30b` was
    soft-deleted through the frontend proxy with `HTTP 200`; repeated delete
    returned `HTTP 409`.
  - The deleted transaction disappeared from active list and filtered export;
    dashboard balance changed from `925000` to `960000`, and monthly expense
    changed from `75000` to `40000`, proving backend balance reversal and active
    read exclusion.
  - Budget remaining proxy after delete returned total/category expense
    `40000`, proving backend recomputation after soft delete.
  - Clear AI history through frontend proxy returned `HTTP 200` with
    `deleted_draft_count=1`; repeated clear returned `HTTP 200` with
    `deleted_draft_count=0`.
  - `/dashboard` returned `HTTP 200`; backend `/health` returned `HTTP 200`.
  - `scripts/runtime-smoke.sh` passed, including health, transaction proxy,
    Alembic current, restart, and persistence proof.
  - Rendered dashboard HTML contained `Export Transactions`,
    `AI History Privacy`, and `Recent Transactions`.
  - `docker compose down` was run without `-v`; persistent volume was preserved.
- Final repository checks:
  - `git diff --check` passed.
  - `scripts/bin/harness-cli query matrix` passed.
