# US-002 Create Harness Story Backlog

## Status

planned

## Lane

high-risk

## Product Contract

Create story packets for each MVP slice so future implementation can proceed incrementally with explicit validation expectations.

## Relevant Product Docs

- `docs/product/expense-ai/PRODUCT_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/product/expense-ai/UX_FLOWS.md`

## Acceptance Criteria

- Epic folders exist for E01 through E06.
- Story packets exist for every MVP story listed in the accepted spec.
- Each story has status, lane, product contract, relevant product docs, acceptance criteria, design notes, and validation expectations.
- Stories touching finance, AI mutation safety, privacy/security, or API contracts are classified high-risk.
- `docs/TEST_MATRIX.md` has planned rows for all MVP stories.

## Design Notes

- Commands: future story execution through Harness/Symphony.
- Queries: dashboard and spending query stories declare query expectations.
- API: API-facing stories reference `API_CONTRACT.md`.
- Tables: database stories reference `DOMAIN_MODEL.md`.
- Domain rules: validation-first ledger mutations.
- UI surfaces: dashboard, chat, history, budgets, and data management.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not required for documentation intake. |
| Integration | Harness matrix query shows planned story records when durable rows are added. |
| E2E | Not required for documentation intake. |
| Platform | `git diff --check`. |
| Release | All minimum backlog story IDs are present. |

## Harness Delta

Creates the MVP backlog under `docs/stories/epics/`.

## Evidence

Add validation output after Phase 0 validation runs.

