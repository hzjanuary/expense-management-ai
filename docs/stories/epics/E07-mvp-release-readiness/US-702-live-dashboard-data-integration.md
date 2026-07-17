# US-702 Live Dashboard Data Integration

## Status

implemented

## Lane

high-risk

## Product Contract

Replace static dashboard summary placeholders with live backend data for
balance, monthly income, monthly expense, selected month, and budget remaining.

## Relevant Product Docs

- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/initiatives/I01-mvp-release-readiness/DEMO_SCRIPT.md`

## Dependencies

- US-205 Dashboard Summary.
- US-402 Category Remaining Budget.
- US-403 Recent Transactions UI.
- US-701 Full-Stack Local Runtime.

## Acceptance Criteria

- Dashboard reads `GET /api/v1/dashboard/summary`.
- Dashboard shows account balance, monthly income, monthly expense, and selected month.
- Dashboard integrates category remaining budget data from US-402.
- Loading, empty, error, and refresh states are present.
- Dashboard refreshes after AI-confirmed transactions.
- Dashboard refreshes after soft deletion.
- Dashboard does not implement budget editing.
- Dashboard does not compute authoritative financial totals in the browser.

## Design Notes

- Commands: none.
- Queries: dashboard summary and budget remaining.
- API: `GET /api/v1/dashboard/summary`, `GET /api/v1/budgets/monthly/{year}/{month}/remaining`.
- Tables: none directly; backend remains source of truth.
- Domain rules: frontend displays integer minor-unit values after formatting.
- UI surfaces: dashboard summary cards, budget remaining panel, refresh affordance.
- Data fetching should follow the selected frontend refresh/cache strategy.

## Explicit Out Of Scope

- Budget editing.
- Manual transaction creation UI.
- AI insight chat UI.
- Export/delete controls.
- Backend dashboard behavior changes unless required by a documented gap.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Component/utility tests for loading, empty, error, and value formatting when frontend test runner exists. |
| Integration | Frontend fetches dashboard and budget remaining APIs with typed responses. |
| E2E | Demo balance, monthly expense, and food remaining update after confirmation and deletion. |
| Platform | Browser smoke on desktop and narrow viewport. |
| Release | Dashboard values match backend API values in release demo. |

## Harness Delta

Added live dashboard data integration proof to the release readiness matrix.

## Evidence

- Implemented same-origin frontend proxy routes:
  - `GET /api/dashboard/summary?month=YYYY-MM`
  - `GET /api/budgets/monthly/{year}/{month}/remaining?currency=VND`
- Proxies use `BACKEND_INTERNAL_URL`, forward supported query parameters,
  preserve safe backend statuses, and return `Cache-Control: no-store`.
- Replaced static dashboard summary cards with live client components for
  selected month, current balance, monthly income, monthly expense, budget
  totals, category budget remaining rows, loading states, missing-budget empty
  state, retry controls, and explicit dashboard refresh.
- Dashboard refresh coordination uses dashboard-owned selected month and a
  shared refresh revision. Successful Chat-to-Ledger confirmation increments
  the revision so summary, budget remaining, and recent transactions refresh
  without a full page reload.
- Stale month-change responses are guarded with `AbortController` and request
  sequence checks.
- Added Vitest + React Testing Library component/proxy coverage for live values,
  loading state, missing budget, month change, stale response protection,
  post-confirm refresh, proxy forwarding, safe error mapping, and `no-store`
  financial responses.

Validation run on 2026-07-17:

- `cd backend && .venv/bin/pytest` -> 238 passed, 1 skipped.
- `cd frontend && npm ci` -> pass; npm reported existing 2 moderate audit
  findings and install-script approval warnings, no forced upgrades applied.
- `cd frontend && npm test` -> 3 files passed, 10 tests passed.
- `cd frontend && npm run lint` -> pass.
- `cd frontend && npm run typecheck` -> pass.
- `cd frontend && npm run build` -> pass.
- `docker compose up -d --build && docker compose ps` -> backend and frontend
  images built; both services healthy.
- `curl -i http://127.0.0.1:8010/health` -> `HTTP/1.1 200 OK`.
- `curl -I http://127.0.0.1:3000/dashboard` -> `HTTP/1.1 200 OK`.
- Created controlled July 2026 budget setup through the existing backend API for
  runtime proxy proof.
- `curl -i "http://127.0.0.1:3000/api/dashboard/summary?month=2026-07"` ->
  `HTTP/1.1 200 OK`, `cache-control: no-store`, live VND balance/income/expense
  JSON from backend.
- `curl -i "http://127.0.0.1:3000/api/budgets/monthly/2026/7/remaining?currency=VND"`
  -> `HTTP/1.1 200 OK`, `cache-control: no-store`, live budget remaining JSON
  from backend.
- `curl -i "http://127.0.0.1:3000/api/transactions"` -> `HTTP/1.1 200 OK`,
  proving existing Recent Transactions proxy still reaches the backend.
- Focused rendered HTML check found none of the old dashboard financial
  placeholder strings.
- `scripts/runtime-smoke.sh` -> passed; backend/frontend reachable, transaction
  proxy reachable, Alembic `0004 (head)`, restart persistence proof passed.
- `docker compose down` -> pass; named SQLite volume preserved.
