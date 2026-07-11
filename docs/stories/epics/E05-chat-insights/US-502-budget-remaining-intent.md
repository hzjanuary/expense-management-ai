# US-502 Budget Remaining Intent

## Status

planned

## Lane

high-risk

## Product Contract

Answer remaining-budget questions from configured budgets and ledger totals without fabricating missing data.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- User can ask `Còn bao nhiêu tiền ăn tháng này?`.
- App returns remaining food budget.
- App handles no budget configured.
- App does not fabricate budget data.
- Tests verify no-budget and budget-configured cases.

## Design Notes

- Commands: none.
- Queries: remaining budget by category/month.
- API: chat insight endpoint to be defined.
- Tables: transaction, budget period, category budget.
- Domain rules: missing budget returns explicit no-budget state.
- UI surfaces: chat insight answer.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Remaining-budget and no-budget calculation tests. |
| Integration | Insight response for configured and missing budget fixtures. |
| E2E | Chat answer renders no-budget and budget cases. |
| Platform | Not required. |
| Release | No fabrication regression test. |

## Harness Delta

TBD.

## Evidence

TBD.
