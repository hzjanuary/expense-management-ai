# US-102 Frontend Bootstrap

## Status

planned

## Lane

normal

## Product Contract

Create the initial Next.js web shell with dashboard, chat input, transaction history, and budget settings placeholders.

## Relevant Product Docs

- `docs/product/expense-ai/PRODUCT_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/decisions/0001-local-first-stack.md`

## Acceptance Criteria

- Next.js app starts locally.
- Dashboard route exists.
- Chat input placeholder exists.
- Transaction history placeholder exists.
- Budget settings placeholder exists.
- Frontend lint/typecheck passes.

## Design Notes

- Commands: none.
- Queries: none yet.
- API: health/provider calls may be stubbed later.
- Tables: none.
- Domain rules: no financial mutation in frontend.
- UI surfaces: dashboard shell, chat panel, history, budget settings.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Component smoke tests once configured. |
| Integration | Not required for placeholder shell. |
| E2E | Browser smoke test that main route loads. |
| Platform | Local frontend startup. |
| Release | Lint/typecheck. |

## Harness Delta

Add frontend proof commands when package scripts exist.

## Evidence

TBD.

