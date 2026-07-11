# US-304 Confirm AI Draft

## Status

planned

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

## Design Notes

- Commands: confirm AI draft.
- Queries: dashboard summary after confirmation.
- API: `POST /api/v1/ai/confirm`.
- Tables: transaction, AI parse attempt/draft.
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

TBD.

## Evidence

TBD.

