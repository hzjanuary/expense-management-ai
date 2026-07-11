# US-404 Chat-To-Ledger UI Flow

## Status

planned

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
- Dashboard totals update after confirmation.
- Transaction history updates after confirmation.
- E2E test covers `Hôm nay tôi tiêu 35k vào ăn trưa`.

## Design Notes

- Commands: parse draft and confirm draft.
- Queries: dashboard summary and recent transactions.
- API: `POST /api/v1/ai/parse`, `POST /api/v1/ai/confirm`, dashboard summary.
- Tables: transaction and AI parse attempt/draft.
- Domain rules: parse does not mutate; confirm mutates once.
- UI surfaces: chat panel, confirmation UI, dashboard, recent transactions.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | UI state machine tests for parse/confirm/cancel. |
| Integration | API flow creates one transaction after confirm. |
| E2E | Canonical Vietnamese shorthand chat flow. |
| Platform | Browser smoke across desktop/mobile viewport when app exists. |
| Release | Provider fake fixture for deterministic E2E. |

## Harness Delta

TBD.

## Evidence

TBD.
