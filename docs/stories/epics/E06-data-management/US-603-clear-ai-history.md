# US-603 Clear AI History

## Status

implemented

## Lane

high-risk

## Product Contract

Let privacy-conscious users clear AI chat/parse history without deleting ledger transactions.

## Relevant Product Docs

- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can clear stored AI draft/history records through
  `DELETE /api/v1/ai/history`.
- Clearing AI history removes raw user text, provider/model metadata, and
  draft lifecycle rows from `ai_transaction_drafts`.
- Clearing AI history does not delete or modify ledger transactions.
- Account balances, budgets, exports, dashboard totals, and insight totals are
  preserved.
- Empty and repeated clear operations are safe and idempotent.
- Tests verify only AI history is removed.

## Design Notes

- Commands: clear AI history.
- Queries: count AI draft rows and distinct linked transactions before delete.
- API: `DELETE /api/v1/ai/history`.
- Tables: `ai_transaction_drafts`.
- Domain rules: ledger transactions remain intact.
- UI surfaces: data management/privacy action remains future scope.
- MVP clearing strategy is physical deletion of AI draft/history rows, not
  anonymization, because the ledger transaction is the financial source of
  truth after confirmation.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Clear-history command preserves transactions. |
| Integration | API removes AI records only. |
| E2E | Not required; no frontend privacy action in US-603. |
| Platform | Not required. |
| Release | Privacy regression test. |

## Harness Delta

- Adds backend-only clear AI history endpoint.
- Does not add frontend, auth, scheduled cleanup, cloud deletion, or full chat
  history persistence.
- No migration required; existing `ai_transaction_drafts` table is reused.

## Evidence

- `cd backend && .venv/bin/pytest tests/test_clear_ai_history_api.py`
- `cd backend && .venv/bin/pytest`
- `cd backend && .venv/bin/ruff check .`
- `cd backend && .venv/bin/black --check .`
- `cd backend && .venv/bin/mypy app`
