# US-305 Low Confidence Clarification

## Status

planned

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
- Missing category can map to `other` only if rule allows it.
- Ambiguous date triggers confirmation or clarification.
- Low confidence draft does not auto-create transaction.
- Tests cover invalid/ambiguous LLM outputs.

## Design Notes

- Commands: classify draft validation result.
- Queries: none.
- API: parse response includes clarification/confirmation state.
- Tables: AI parse attempt records validation status.
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

TBD.

## Evidence

TBD.

