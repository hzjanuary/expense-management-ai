# US-304 Confirm AI Draft

## Status

implemented

## Lane

high-risk

## Product Contract

Create a ledger transaction exactly once from a valid confirmed AI draft.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/decisions/0003-ledger-mutation-safety.md`

## Acceptance Criteria

- Valid draft can be confirmed.
- Confirmation creates transaction.
- Confirmation updates balance and dashboard totals.
- Draft cannot be confirmed twice.
- Expired draft cannot be confirmed.
- Tests cover duplicate confirmation prevention.
- Confirmation revalidates stored draft rules before ledger mutation.
- Confirmation does not call the LLM provider.

## Design Notes

- Commands: confirm AI draft.
- Queries: dashboard summary after confirmation.
- API: `POST /api/v1/ai/confirm`.
- Tables: transaction, `ai_transaction_drafts`.
- Domain rules: idempotency and expiration are enforced.
- UI surfaces: confirmation action.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Confirm command idempotency and expiration tests. |
| Integration | API creates one transaction and updates totals. |
| E2E | Covered by chat-to-ledger UI story. |
| Platform | Not required. |
| Release | Duplicate confirmation regression test. |

## Harness Delta

- Added `ai_transaction_drafts` persistence with pending, confirmed, and expired lifecycle.
- Updated `POST /api/v1/ai/parse` to return `draft_id` for confirmable create-transaction drafts and persist only validated drafts.
- Added `POST /api/v1/ai/confirm` to revalidate a pending draft, create one `ai_chat` transaction, update balance, and mark the draft confirmed atomically.
- Added duplicate-confirmation, expiration, invalid draft, currency mismatch, and no-provider-call regression proof.

## Evidence

- `cd backend && .venv/bin/pytest` -> 139 passed, 1 skipped.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- `POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us304-alembic.db .venv/bin/alembic current` -> `0003 (head)`.
- `POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us304-alembic.db .venv/bin/alembic upgrade head` -> passed.
- `POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us304-alembic.db .venv/bin/alembic downgrade base` -> passed.
- `POCKET_LEDGER_DATABASE_URL=sqlite+aiosqlite:////tmp/pocket-ledger-us304-alembic.db .venv/bin/alembic upgrade head` -> passed.
- Async SQLite validation commands were run outside the current sandbox because `aiosqlite` connections hang inside it.
