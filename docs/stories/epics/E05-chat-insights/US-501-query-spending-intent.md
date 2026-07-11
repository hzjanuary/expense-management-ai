# US-501 Query Spending Intent

## Status

planned

## Lane

high-risk

## Product Contract

Answer category spending questions from ledger totals rather than LLM guesses.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can ask `Tháng này tôi ăn uống hết bao nhiêu?`.
- App maps query to category/date range.
- App answers using database totals, not LLM guesses.
- Answer includes amount and date range.
- Tests verify the answer is based on ledger records.

## Design Notes

- Commands: none.
- Queries: spending total by category/date range.
- API: chat insight endpoint to be defined.
- Tables: transaction, category.
- Domain rules: LLM classifies; database computes.
- UI surfaces: chat insight answer.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Intent extraction normalization and total calculation tests. |
| Integration | Insight response from seeded ledger records. |
| E2E | Chat question displays ledger-backed answer. |
| Platform | Not required. |
| Release | Fixture for Vietnamese spending question. |

## Harness Delta

TBD.

## Evidence

TBD.
