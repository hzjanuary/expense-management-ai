# US-706 End-To-End MVP Demo

## Status

implemented

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

Implemented artifacts:

- `compose.e2e.yaml` isolates the E2E backend/frontend runtime and database
  volume under Compose project `pocket-ledger-e2e`.
- `scripts/e2e-mvp.sh` is the root one-command E2E runner. It builds the
  isolated stack, waits for health, verifies Alembic, runs the guarded seed,
  executes Playwright, captures logs/artifacts on failure, and removes only the
  isolated E2E volume.
- `backend/app/cli/e2e_seed.py` resets the E2E database only when
  `POCKET_LEDGER_ENVIRONMENT=test` and the SQLite database path is clearly
  E2E-specific. It seeds one default account with `1,000,000 VND` stored
  balance and no transactions, budgets, or AI drafts.
- `frontend/playwright.config.ts` configures Chromium, `vi-VN` locale,
  `Asia/Ho_Chi_Minh` timezone, one worker, failure screenshots, traces, videos,
  and HTML report output.
- `frontend/e2e/mvp-demo.spec.ts` covers the complete local-first MVP demo
  through the browser.

Validation completed on 2026-07-18:

- `cd backend && .venv/bin/pytest tests/test_e2e_seed_guard.py`: passed
  (`3 passed`).
- `cd backend && .venv/bin/pytest`: passed (`241 passed, 1 skipped`).
- `cd backend && .venv/bin/ruff check .`: passed.
- `cd backend && .venv/bin/black --check .`: passed.
- `cd backend && .venv/bin/mypy app`: passed.
- `cd frontend && npm ci`: passed. NPM reported two moderate audit findings;
  no unrelated dependency remediation was performed.
- `cd frontend && npm test`: passed (`9 files`, `49 tests`).
- `cd frontend && npm run lint`: passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm run build`: passed.
- `scripts/e2e-mvp.sh`: passed from clean isolated state; Playwright reported
  `1 passed`.
- `scripts/e2e-mvp.sh`: passed a second consecutive clean isolated run;
  Playwright reported `1 passed`.
- Normal Compose regression passed after the isolated E2E proof:
  `docker compose up -d --build`, backend `/health` returned `HTTP 200`,
  `/dashboard` returned `HTTP 200` after frontend health completed, default
  Ollama-disabled AI parse returned safe `HTTP 503` provider-unavailable
  behavior, and `scripts/runtime-smoke.sh` passed.

The E2E scenario proves:

- opening balance is exactly `1,000,000 VND`;
- budget setup is completed through the UI;
- AI transaction draft review does not mutate the ledger before explicit
  confirmation;
- confirmation creates the transaction through the backend confirm flow;
- dashboard totals, budget progress, and recent transactions refresh without a
  full page reload;
- spending, budget remaining, and top-category insights render structured
  backend values;
- CSV and JSON downloads include the expected transaction and exclude forbidden
  internal fields;
- soft delete reverses financial effects through the backend and refreshes live
  views;
- clear AI history preserves ledger state.
