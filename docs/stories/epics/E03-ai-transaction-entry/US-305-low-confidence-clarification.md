# US-305 Low Confidence Clarification

## Status

implemented

## Lane

high-risk

## Product Contract

Ask targeted clarification or confirmation when LLM output is ambiguous, invalid, or low confidence.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/decisions/0003-ledger-mutation-safety.md`

## Acceptance Criteria

- Missing amount triggers clarification.
- Missing category triggers clarification and is not mapped silently.
- Ambiguous date triggers confirmation or clarification.
- Low confidence draft does not auto-create transaction.
- Tests cover invalid/ambiguous LLM outputs.
- Unknown input returns clarification and no confirmable draft.
- Complete valid low-confidence draft may be persisted, but only mutates through explicit confirmation.
- Invalid category/type mismatch does not create a confirmable draft.

## Design Notes

- Commands: classify draft validation result.
- Queries: none.
- API: parse response includes clarification/confirmation state.
- Tables: no new tables; reuses `ai_transaction_drafts` only for complete valid drafts.
- Domain rules: ambiguous output never mutates ledger.
- UI surfaces: clarification and confirm/edit/cancel flow.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Missing/ambiguous field validation tests. |
| Integration | Parse API returns clarification state and no transaction. |
| E2E | Later chat UI should exercise clarification. |
| Platform | Not required. |
| Release | Low-confidence provider fixture. |

## Harness Delta

- Added optional `clarification` parse response object with deterministic message and fields.
- Missing amount, missing category, invalid category, category/type mismatch, and unknown intent now return safe clarification without `draft_id`.
- Complete valid low-confidence drafts are persisted as pending and require explicit confirmation.
- Existing high-confidence parse and confirm flow remains unchanged.
- No database migration was added.

## Evidence

- `cd backend && .venv/bin/pytest` -> 144 passed, 1 skipped.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- Alembic validation not run because no schema or migration files changed.
- Async SQLite tests were run outside the current sandbox because `aiosqlite` connections hang inside it.
