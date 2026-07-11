# US-003 Record Architecture Decisions

## Status

planned

## Lane

high-risk

## Product Contract

Record durable architecture choices for the local-first stack, LLM provider abstraction, and ledger mutation safety.

## Relevant Product Docs

- `docs/product/expense-ai/PRODUCT_CONTRACT.md`
- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/decisions/0001-local-first-stack.md`
- `docs/decisions/0002-llm-provider-abstraction.md`
- `docs/decisions/0003-ledger-mutation-safety.md`

## Acceptance Criteria

- Decision 0001 exists and follows `docs/templates/decision.md`.
- Decision 0002 exists and follows `docs/templates/decision.md`.
- Decision 0003 exists and follows `docs/templates/decision.md`.
- Each decision includes context, decision, alternatives, consequences, and follow-up.

## Design Notes

- Commands: future durable decision rows through `harness-cli decision add`.
- Queries: none.
- API: provider status and ledger mutation decisions constrain future APIs.
- Tables: SQLite and ledger safety decisions constrain persistence stories.
- Domain rules: command handlers own financial mutations.
- UI surfaces: provider status must be visible in future UI.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not required for documentation intake. |
| Integration | Harness decision query after durable rows are added. |
| E2E | Not required. |
| Platform | `git diff --check`. |
| Release | Decision docs exist and are internally consistent. |

## Harness Delta

Adds durable decision documents for future agents.

## Evidence

Add validation output after Phase 0 validation runs.

