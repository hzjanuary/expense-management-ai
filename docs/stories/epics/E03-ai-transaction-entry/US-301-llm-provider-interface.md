# US-301 LLM Provider Interface

## Status

planned

## Lane

high-risk

## Product Contract

Define a provider interface that returns structured drafts and status without coupling provider behavior to ledger mutations.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/decisions/0002-llm-provider-abstraction.md`
- `docs/decisions/0003-ledger-mutation-safety.md`

## Acceptance Criteria

- Interface supports `parse_transaction_text`.
- Provider returns structured JSON only.
- Provider errors are normalized.
- Provider health status is available.
- Unit tests use fake provider.

## Design Notes

- Commands: parse text into draft.
- Queries: provider status.
- API: provider status endpoint consumes this interface.
- Tables: optional parse-attempt persistence in later stories.
- Domain rules: provider cannot mutate ledger.
- UI surfaces: provider status display later.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Fake provider tests for success/error/status. |
| Integration | Not required until adapter/API story. |
| E2E | Not required. |
| Platform | Not required. |
| Release | Provider contract type checks. |

## Harness Delta

TBD.

## Evidence

TBD.

