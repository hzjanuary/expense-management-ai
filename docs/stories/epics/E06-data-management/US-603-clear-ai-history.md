# US-603 Clear AI History

## Status

planned

## Lane

high-risk

## Product Contract

Let privacy-conscious users clear AI chat/parse history without deleting ledger transactions.

## Relevant Product Docs

- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can clear raw AI chat/parse attempts.
- Clearing AI history does not delete transactions.
- UI explains what is deleted.
- Tests verify only AI history is removed.

## Design Notes

- Commands: clear AI history.
- Queries: AI history count/status if needed.
- API: clear AI history endpoint to be defined.
- Tables: chat message, AI parse attempt.
- Domain rules: ledger transactions remain intact.
- UI surfaces: data management/privacy action.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Clear-history command preserves transactions. |
| Integration | API removes AI records only. |
| E2E | UI privacy action when implemented. |
| Platform | Not required. |
| Release | Privacy regression test. |

## Harness Delta

TBD.

## Evidence

TBD.

