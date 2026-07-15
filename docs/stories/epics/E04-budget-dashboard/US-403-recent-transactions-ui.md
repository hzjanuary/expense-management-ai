# US-403 Recent Transactions UI

## Status

implemented

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
- Loading and error states are displayed safely.
- Refresh button reloads recent transactions without a full page reload.
- No transaction creation UI is implemented in this story.

## Design Notes

- Commands: none.
- Queries: list recent transactions.
- API: `GET /api/v1/transactions`.
- Tables: none directly.
- Domain rules: UI does not compute authoritative balances.
- UI surfaces: recent transactions and history.
- Frontend uses a same-origin Next.js route handler that proxies to the configured backend API base URL to avoid browser CORS assumptions.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not configured; no frontend test runner exists yet. |
| Integration | Frontend lint/typecheck/build prove typed API client and rendering compile. |
| E2E | Local dashboard smoke returned HTTP 200. |
| Platform | Browser responsive smoke check. |
| Release | Frontend lint/typecheck. |

## Harness Delta

- Added frontend proof for US-403.
- Updated test matrix and durable Harness story row.

## Evidence

- `cd frontend && npm run lint` - passed.
- `cd frontend && npm run typecheck` - passed.
- `cd frontend && npm run build` - passed.
- `cd frontend && npm run dev -- --hostname 127.0.0.1 --port 3000` - passed with local server ready.
- `curl -I http://127.0.0.1:3000/dashboard` - passed, returned `HTTP/1.1 200 OK`.
