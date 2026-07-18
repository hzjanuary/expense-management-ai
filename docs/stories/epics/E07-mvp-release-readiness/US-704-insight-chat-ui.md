# US-704 Insight Chat UI

## Status

implemented

## Lane

high-risk

## Product Contract

Extend the existing chat surface to support DB-grounded spending, budget
remaining, and spending breakdown questions while preserving transaction
parse/confirm behavior.

## Relevant Product Docs

- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/decisions/0002-llm-provider-abstraction.md`
- `docs/decisions/0003-ledger-mutation-safety.md`

## Dependencies

- US-404 Chat-to-Ledger UI Flow.
- US-501 Query Spending Intent.
- US-502 Budget Remaining Intent.
- US-503 Spending Breakdown Intent.
- US-701 Full-Stack Local Runtime.

## Acceptance Criteria

- Chat UI routes query spending requests to the existing backend endpoint.
- Chat UI routes budget remaining requests to the existing backend endpoint.
- Chat UI routes spending breakdown requests to the existing backend endpoint.
- UI displays structured DB-grounded answers and date ranges.
- Existing transaction parse/confirm flow remains intact.
- Clarification and provider error states are shown safely.
- Free-form model output is not displayed as authoritative financial totals.
- No persistent multi-turn chat history is added.

## Design Notes

- Commands: none; insight chat is read-only.
- Queries: query spending, query budget remaining, query spending breakdown.
- API: `POST /api/v1/ai/query-spending`, `POST /api/v1/ai/query-budget-remaining`, `POST /api/v1/ai/query-spending-breakdown`.
- Tables: none directly; backend computes from persisted ledger/budget data.
- Domain rules: frontend must label totals as backend-computed answer fields.
- UI surfaces: chat input, answer cards/messages, clarification states.
- Intent routing may be deterministic client-side menu/selector or explicit
  backend endpoint selection; implementation story should choose and document it.
- Implemented with a narrow deterministic frontend router for the accepted
  canonical Vietnamese examples plus explicit quick-action buttons and an
  intent selector. Unsupported text produces a local clarification and does not
  call a financial endpoint.
- Insight cards render only typed backend response fields. Amounts,
  remaining values, percentages, date ranges, ordering, and top category are not
  calculated authoritatively in the frontend.
- Prior insight answers are marked stale when dashboard financial data changes
  through the shared refresh signal; insight queries are not automatically
  rerun.

## Explicit Out Of Scope

- Persistent chat history.
- Natural-language intent router beyond existing backend endpoints.
- Budget mutation through chat.
- Transaction deletion through chat.
- Cloud providers.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Component tests for structured answers, clarification, and error states. |
| Integration | UI calls each existing insight endpoint and renders typed responses. |
| E2E | Demo insight questions return expected spending, remaining budget, and top category values. |
| Platform | Browser smoke for chat interaction and keyboard flow. |
| Release | No fabricated totals shown from provider text. |

## Harness Delta

US-704 is marked implemented with unit, integration, and UI-flow proof. US-705
through US-707 remain planned.

## Evidence

- `cd frontend && npm ci && npm test && npm run lint && npm run typecheck && npm run build`
  passed. Vitest reported 7 files and 34 tests passing.
- `cd backend && .venv/bin/pytest` passed with 238 tests passing and 1 skipped.
- `docker compose up -d --build` built backend and frontend images and started
  both services healthy.
- Default Ollama-disabled runtime proof:
  - `POST /api/ai/query-spending` returned `503` with
    `{"error":"Local AI is disabled or unavailable. Start Ollama or try again later."}`
    and `Cache-Control: no-store`.
  - `POST /api/ai/query-budget-remaining` returned the same safe `503`.
  - `POST /api/ai/query-spending-breakdown` returned the same safe `503`.
- `curl -I http://127.0.0.1:3000/dashboard` returned `HTTP 200`.
- `curl -i http://127.0.0.1:8010/health` returned `HTTP 200` with
  `{"status":"ok"}`.
- `scripts/runtime-smoke.sh` passed, including backend health, frontend
  dashboard reachability, transaction proxy reachability, Alembic current at
  `0004 (head)`, restart checks, and persisted transaction proof.
- `docker compose down` stopped the stack without removing persistent volumes.
