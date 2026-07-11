# US-303 AI Parse Draft

## Status

planned

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
- Date maps to current local date.
- Draft does not mutate ledger.
- Tests cover Vietnamese shorthand amounts.

## Design Notes

- Commands: create AI draft.
- Queries: none.
- API: `POST /api/v1/ai/parse`.
- Tables: AI parse attempt and draft storage if needed.
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

TBD.

## Evidence

TBD.
