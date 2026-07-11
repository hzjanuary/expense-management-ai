# 0003 Ledger Mutation Safety

Date: 2026-07-11

## Status

Accepted

## Context

AI parsing can hallucinate or misclassify financial records. Incorrect writes would corrupt balances, budgets, and user trust. The product needs chat entry while preserving deterministic finance behavior.

## Decision

AI output can create drafts only. Domain command handlers are the only code allowed to mutate financial records. Drafts must pass schema validation, business validation, and confirmation rules before a transaction is created.

## Alternatives Considered

1. Let AI call transaction creation directly.
2. Let the frontend trust AI JSON and create records.
3. Store AI output as transactions without validation.

## Consequences

Positive:

- Prevents hallucinated writes.
- Keeps finance math deterministic.
- Makes ledger mutations easier to test and audit.
- Separates provider behavior from financial state changes.

Tradeoffs:

- More confirmation steps.
- Slightly slower chat flow.
- Draft lifecycle and duplicate-confirmation prevention must be implemented.

## Follow-Up

- Phase 3 stories must prove parse endpoints do not mutate the ledger.
- Confirmation must be idempotent and reject duplicate or expired drafts.

