# US-404 Chat-To-Ledger UI Flow

## Status

implemented

## Lane

high-risk

## Product Contract

Let users type a transaction in chat, confirm the draft when required, and see dashboard/history update from the ledger.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/decisions/0003-ledger-mutation-safety.md`

## Acceptance Criteria

- Chat input sends message to parse API.
- High-confidence draft can be recorded.
- Confirmation UI appears when needed.
- Dashboard totals update after confirmation when a future dashboard summary UI is wired.
- Transaction history updates after confirmation.
- Local dashboard smoke covers the Chat-to-Ledger shell. Full backend-backed E2E flow remains a later harness/browser fixture because no frontend test runner is configured yet.
- Frontend does not call the manual transaction creation endpoint for AI drafts.
- Parse does not mutate the ledger; confirm uses `POST /api/v1/ai/confirm`.

## Design Notes

- Commands: parse draft and confirm draft.
- Queries: recent transactions refresh after confirmation.
- API: frontend same-origin route handlers proxy `POST /api/v1/ai/parse`, `POST /api/v1/ai/confirm`, and existing recent transactions.
- Tables: transaction and AI parse attempt/draft.
- Domain rules: parse does not mutate; confirm mutates once.
- UI surfaces: chat panel, confirmation UI, dashboard, recent transactions.
- Cancel clears only the local draft review state; no backend draft cancellation endpoint exists in this story.
- Clarification responses show the backend message and missing fields, then rely on single-turn retry.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not configured; no frontend test runner exists yet. |
| Integration | Frontend lint/typecheck/build prove typed parse/confirm clients and rendering compile. |
| E2E | Local dashboard smoke returned HTTP 200. |
| Platform | Local dashboard route smoke. |
| Release | Frontend lint/typecheck/build. |

## Harness Delta

- Added frontend Chat-to-Ledger proof for US-404.
- Updated test matrix and durable Harness story row.

## Evidence

- `cd frontend && npm run lint` - passed.
- `cd frontend && npm run typecheck` - passed.
- `cd frontend && npm run build` - passed.
- `cd frontend && npm run dev -- --hostname 127.0.0.1 --port 3000` - passed with local server ready.
- `curl -I http://127.0.0.1:3000/dashboard` - passed, returned `HTTP/1.1 200 OK`.
- Backend files were not changed.
