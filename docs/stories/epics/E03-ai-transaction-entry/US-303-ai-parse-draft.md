# US-303 AI Parse Draft

## Status

implemented

## Lane

high-risk

## Product Contract

Parse chat text into a transaction draft without mutating the ledger.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/decisions/0003-ledger-mutation-safety.md`

## Acceptance Criteria

- API accepts raw chat message.
- API returns transaction draft.
- `35k` is normalized to `35000`.
- Category maps to `food`.
- Date remains conservative as `occurred_at = null` for relative text in US-303.
- Draft does not mutate ledger.
- Tests cover Vietnamese shorthand amounts.
- Provider unavailable, timeout, and invalid response errors map to safe API errors.
- Provider output is validated against money, currency, transaction type, and category rules.

## Design Notes

- Commands: parse AI draft in memory.
- Queries: none.
- API: `POST /api/v1/ai/parse`.
- Tables: none in US-303; draft persistence is out of scope.
- Domain rules: parse route cannot create transactions.
- UI surfaces: chat entry panel.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Vietnamese amount normalization and draft validation. |
| Integration | Parse API returns draft and transaction count remains unchanged. |
| E2E | Covered later by chat-to-ledger UI story. |
| Platform | Not required. |
| Release | Fixture for `Hôm nay tôi tiêu 35k vào ăn trưa`. |

## Harness Delta

- Added safe AI parse API route backed by the existing LLM provider interface.
- Added provider factory behavior: Ollama when enabled, fake provider for local/test/development, unavailable in production-like mode when Ollama is disabled.
- Added application-level draft validation before returning a typed response.
- Preserved ledger mutation safety: no transaction command handler, database write, draft persistence, or balance update occurs in US-303.

## Evidence

- `cd backend && .venv/bin/pytest` -> 129 passed, 1 skipped.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- Alembic validation not run because no schema or migration files changed.
