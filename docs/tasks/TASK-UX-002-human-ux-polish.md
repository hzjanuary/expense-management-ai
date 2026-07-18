# TASK-UX-002 Human UX Polish and Vietnamese Copy Review

Status: implemented

## Scope

Polish the post-MVP multi-page frontend for Vietnamese-speaking low-tech and
non-technical users without changing financial behavior or backend contracts.

## Changes

- Reworked user-facing Vietnamese labels, helper text, empty states, loading
  states, error states, success messages, and destructive-action copy.
- Kept technical wording out of normal navigation and primary user surfaces.
- Preserved the five-page structure from TASK-UX-001:
  `/dashboard`, `/transactions`, `/budgets`, `/assistant`, and `/settings`.
- Clarified transaction soft delete as hiding the transaction from active views
  and reversing its balance effect, not permanently erasing the row.
- Clarified AI-history clearing as deleting local AI draft/history records while
  preserving confirmed transactions, balances, and budgets.
- Kept assistant state session-only and preserved explicit confirmation before
  financial mutation.
- Added a distinct empty result state for transaction filters and search.

## Out Of Scope

- No new product features.
- No backend API behavior changes.
- No new AI intents or general-purpose chat behavior.
- No migrations, authentication, cloud behavior, telemetry, or analytics.
- No new dependencies or global state libraries.
- No Initiative I02 work.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Frontend dependency install | `cd frontend && npm ci` | passed; lockfile install completed with existing 2 moderate npm audit findings |
| Frontend unit/component | `cd frontend && npm test` | passed: 11 files, 59 tests |
| Frontend lint | `cd frontend && npm run lint` | passed |
| Frontend typecheck | `cd frontend && npm run typecheck` | passed |
| Frontend build | `cd frontend && npm run build` | passed; routes generated for `/dashboard`, `/transactions`, `/budgets`, `/assistant`, and `/settings` |
| Backend regression | `cd backend && .venv/bin/pytest` | passed: 241 passed, 1 skipped, 1 warning |
| Compose config | `docker compose config` | passed |
| Runtime smoke | `docker compose up -d --build && scripts/runtime-smoke.sh && docker compose down` | passed; backend/frontend health, transaction proxy, Alembic current, and persistence restart proof passed; normal volume preserved |
| Playwright MVP E2E | `scripts/e2e-mvp.sh` | passed after selector/copy updates; browser flow covered all five routes, downloads, delete, clear history, axe smoke, and responsive overflow checks at 375x812, 390x844, 768x1024, 1280x800, and 1440x900 |
| Git whitespace | `git diff --check` | passed |

## Evidence

- Frontend Vietnamese copy now uses plain wording for navigation, dashboard,
  transactions, budgets, assistant, settings, empty states, loading states,
  success states, and failure states.
- Dashboard remains a compact overview and does not render full assistant,
  export, budget-editing, or clear-history controls.
- Transactions page keeps filters, export, recent transactions, and soft-delete
  behavior, with distinct copy for an empty ledger and empty filter results.
- Budgets page keeps the existing setup/progress behavior with localized field
  labels, validation messages, save status, and over-budget text.
- Assistant page keeps deterministic intent routing, session-only conversation
  state, structured insight results, and explicit transaction confirmation.
- Settings page keeps local Ollama guidance and separates AI history from
  financial transaction history.
- No backend API, financial calculation, migration, dependency, authentication,
  cloud, telemetry, or Initiative I02 work was added.
