# US-706 End-To-End MVP Demo

## Status

planned

## Lane

high-risk

## Product Contract

Add an E2E runner and deterministic tests proving the complete MVP demo flow
across frontend, backend, SQLite, and fake/local provider behavior.

## Relevant Product Docs

- `docs/product/expense-ai/PRODUCT_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/initiatives/I01-mvp-release-readiness/DEMO_SCRIPT.md`
- `docs/initiatives/I01-mvp-release-readiness/RELEASE_CRITERIA.md`

## Dependencies

- US-701 Full-Stack Local Runtime.
- US-702 Live Dashboard Data Integration.
- US-703 Budget Setup And Progress UI.
- US-704 Insight Chat UI.
- US-705 Data Management UI.

## Acceptance Criteria

- Playwright or equivalent E2E runner is added.
- Normal E2E does not require real Ollama.
- E2E uses deterministic seeded test data.
- E2E covers dashboard startup.
- E2E covers budget setup.
- E2E covers AI parse, draft review, and explicit confirmation.
- E2E covers recent transaction refresh.
- E2E covers live dashboard totals and budget remaining.
- E2E covers spending, budget, and breakdown insight queries.
- E2E covers export.
- E2E covers soft delete.
- E2E covers clear AI history.
- Optional Ollama E2E is separately gated if added.

## Design Notes

- Commands: E2E runner command, full-stack startup/reset command.
- Queries: all release demo APIs through UI.
- API: existing backend APIs only unless test harness needs a scoped reset/seed hook.
- Tables: deterministic test database; no production data.
- Domain rules: fake provider and seeded ledger must produce deterministic expected values.
- UI surfaces: full demo path from `DEMO_SCRIPT.md`.

## Explicit Out Of Scope

- Real Ollama requirement for normal E2E.
- Cloud browser/device grid.
- Production deployment.
- Performance/load testing.
- New product features.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not primary; lower-level story tests remain separate. |
| Integration | Full-stack startup and seeded database setup. |
| E2E | Complete deterministic demo flow passes. |
| Platform | Local browser execution proof. |
| Release | E2E command included in release validation report. |

## Harness Delta

Adds the first full MVP browser proof path and release demo validation command.

## Evidence

TBD.

