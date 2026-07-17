# US-703 Budget Setup And Progress UI

## Status

implemented

## Lane

high-risk

## Product Contract

Allow users to configure monthly total and category budgets, then display spent,
remaining, and over-budget state from existing budget APIs.

## Relevant Product Docs

- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/initiatives/I01-mvp-release-readiness/DEMO_SCRIPT.md`

## Dependencies

- US-401 Monthly Budget Setup.
- US-402 Category Remaining Budget.
- US-701 Full-Stack Local Runtime.
- US-702 Live Dashboard Data Integration.

## Acceptance Criteria

- User can create or update total monthly budget.
- User can configure expense-category budgets.
- UI displays configured budget, spent, remaining, and over-budget state.
- UI uses existing US-401 and US-402 APIs.
- Amount inputs preserve integer minor-unit behavior.
- Negative, float, unsupported category, duplicate category, and over-total
  invalid states get safe feedback.
- Successful update refreshes dashboard budget state.
- No AI budget mutation is added.

## Design Notes

- Commands: budget setup upsert through existing API.
- Queries: get budget setup and computed remaining values.
- API: `PUT /api/v1/budgets/monthly/{year}/{month}`, `GET /api/v1/budgets/monthly/{year}/{month}`, `GET /api/v1/budgets/monthly/{year}/{month}/remaining`.
- Tables: existing budget tables only.
- Domain rules: expense categories only; integer minor-unit amounts.
- UI surfaces: budget settings form, category budget list, progress/remaining state.

## Explicit Out Of Scope

- AI budget intent mutation.
- Budget alerts.
- New backend budget schema.
- Custom categories.
- Budget history analytics.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Component/form validation tests for budget amounts and category rows. |
| Integration | API calls persist and reload budget setup; invalid requests surface errors. |
| E2E | Demo sets total budget `5,000,000` and food budget `2,000,000`, then sees remaining update. |
| Platform | Responsive budget form smoke. |
| Release | Budget values remain consistent after transaction confirmation and deletion. |

## Harness Delta

Added frontend budget setup/progress proof to the release readiness matrix.

## Evidence

- Added same-origin monthly budget setup proxy:
  - `GET /api/budgets/monthly/{year}/{month}?currency=VND`
  - `PUT /api/budgets/monthly/{year}/{month}`
- Proxy uses server-only `BACKEND_INTERNAL_URL`, forwards accepted
  `category_budgets` payloads through an explicit allowlist, uses `no-store`,
  preserves missing-budget and validation statuses, and returns safe errors.
- Added typed frontend budget setup models and clients for configured monthly
  budgets, upsert requests, and remaining-budget reads.
- Added canonical frontend expense category options matching backend domain
  categories: `food`, `coffee`, `transport`, `shopping`, `bills`, `rent`,
  `health`, `education`, `entertainment`, and `other`.
- Added inline expandable dashboard budget setup form for the selected month.
  The form supports total monthly budget, add/remove category budget rows,
  existing budget prefill, create state on `404`, integer VND validation,
  duplicate and invalid category checks, category-total-over-monthly-total
  checks, submit loading, success, and safe error states.
- Month changes deterministically discard unsaved edits and refetch the newly
  selected month; stale prefill responses are blocked with `AbortController`
  and request sequence checks.
- Successful saves invoke the existing dashboard refresh callback so budget
  progress, summary, and recent transactions refresh without a full page reload.
- Existing read-only budget progress panel remains in place and exposes
  setup/edit actions.

Validation run on 2026-07-17:

- `cd frontend && npm ci` -> pass; npm reported existing 2 moderate audit
  findings and install-script approval warnings, no forced upgrades applied.
- `cd frontend && npm test` -> 5 files passed, 22 tests passed.
- `cd frontend && npm run lint` -> pass.
- `cd frontend && npm run typecheck` -> pass.
- `cd frontend && npm run build` -> pass.
- `cd backend && .venv/bin/pytest` -> 238 passed, 1 skipped.
- `docker compose up -d --build && docker compose ps` -> backend and frontend
  images built; both services healthy.
- `curl -i "http://127.0.0.1:3000/api/budgets/monthly/2026/7?currency=VND"`
  -> `HTTP/1.1 200 OK`, `cache-control: no-store`.
- `curl -i -X PUT "http://127.0.0.1:3000/api/budgets/monthly/2026/7" ...`
  with `total_budget_minor=5000000` and food `budget_minor=2000000` ->
  `HTTP/1.1 200 OK`, persisted accepted `category_budgets` response.
- Re-read monthly budget setup through the frontend proxy -> `HTTP/1.1 200 OK`
  with configured budget values.
- `curl -i "http://127.0.0.1:3000/api/budgets/monthly/2026/7/remaining?currency=VND"`
  -> `HTTP/1.1 200 OK`, remaining budget response reflected configured food
  budget and current ledger spending.
- `curl -I http://127.0.0.1:3000/dashboard` -> `HTTP/1.1 200 OK`.
- Rendered dashboard HTML contains the `Set up budget` control and existing
  budget progress surface. Browser plugin was not available in this environment;
  Playwright E2E remains explicitly scoped to US-706.
- `scripts/runtime-smoke.sh` -> passed; backend/frontend reachable, transaction
  proxy reachable, Alembic `0004 (head)`, restart persistence proof passed.
- `docker compose down` -> pass; named SQLite volume preserved.
