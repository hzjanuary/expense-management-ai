# TASK-UX-001 Multi-Page Navigation, Assistant Workspace, And Ollama Configuration

Status: implemented

## Scope

Refactor the post-MVP frontend into separate user-facing pages for overview,
transactions, budgets, assistant, and settings while preserving existing backend
financial behavior. Configure tracked Ollama examples for
`qwen3:4b-instruct` while keeping Ollama disabled by default.

## Acceptance Criteria

- `/dashboard`, `/transactions`, `/budgets`, `/assistant`, and `/settings`
  exist.
- Desktop sidebar and mobile bottom navigation expose Vietnamese user-facing
  labels.
- Dashboard is a compact overview and no longer contains full budget editing,
  export, AI history, or assistant workspace controls.
- Transactions page contains transaction list, filters, soft delete, and
  CSV/JSON export.
- Budgets page contains budget setup/edit and budget progress.
- Assistant page contains the transaction draft and insight chat workspace.
- Settings page contains local AI/Ollama guidance and clear-AI-history privacy
  controls.
- Existing transaction draft confirmation and insight behavior remain
  deterministic and backend-grounded.
- Session chat state is not persisted.
- Shared button/control primitives provide consistent sizing and alignment.
- `.env.example` uses `POCKET_LEDGER_OLLAMA_MODEL=qwen3:4b-instruct` and keeps
  `POCKET_LEDGER_OLLAMA_ENABLED=false`.
- No model is downloaded automatically.
- No migrations, authentication, cloud integration, general-purpose economics
  chat, or new financial calculations are added.

## Validation Plan

| Check | Command | Result |
| --- | --- | --- |
| Frontend unit/component | `cd frontend && npm test` | passed: 11 files, 59 tests |
| Frontend lint | `cd frontend && npm run lint` | passed |
| Frontend typecheck | `cd frontend && npm run typecheck` | passed |
| Frontend build | `cd frontend && npm run build` | passed; routes generated for `/dashboard`, `/transactions`, `/budgets`, `/assistant`, `/settings` |
| Backend regression | `cd backend && .venv/bin/pytest && .venv/bin/ruff check . && .venv/bin/black --check . && .venv/bin/mypy app` | passed: 241 passed, 1 skipped, 1 warning; lint/format/typecheck passed |
| Compose config | `docker compose config` | passed |
| Runtime smoke | `scripts/runtime-smoke.sh` | passed; backend/frontend reachable and persistence restart proof passed |
| Playwright MVP E2E | `scripts/e2e-mvp.sh` | passed; browser flow covers new routes and responsive overflow checks at 375x812, 768x1024, and 1440x900 |
| Ollama host model check | `curl http://127.0.0.1:11434/api/tags`; `ollama show qwen3:4b-instruct` | passed on host; backend container could not reach host Ollama on this run and returned safe provider-unavailable behavior |
| Disabled provider proof | `POCKET_LEDGER_OLLAMA_ENABLED=false docker compose up -d --build`; `curl /health`; `POST /api/v1/ai/parse` | passed: `/health` returned 200 and AI parse returned 503 provider unavailable |
| Git whitespace | `git diff --check` | pending final check |

## Evidence

- Added a reusable app shell with desktop sidebar, mobile bottom navigation,
  skip link, semantic links, active-page state, and page header.
- Split MVP frontend surfaces across `/dashboard`, `/transactions`, `/budgets`,
  `/assistant`, and `/settings`.
- Reduced dashboard to live overview cards, budget preview, recent transaction
  preview, and quick actions.
- Moved transaction filters/export/soft delete to `/transactions`, budget setup
  and progress to `/budgets`, chat-to-ledger and insights to `/assistant`, and
  Ollama/privacy controls to `/settings`.
- Standardized buttons and key form controls through shared UI primitives.
- Preserved existing backend APIs, financial mutation rules, insight routing,
  export behavior, soft delete, and AI-history clearing.
- Updated tracked Ollama model examples/defaults to `qwen3:4b-instruct` while
  keeping repository defaults disabled.
- Updated the ignored local `.env` to enable host Ollama with
  `qwen3:4b-instruct` and `POCKET_LEDGER_OLLAMA_TIMEOUT_SECONDS=60`; `.env`
  remains ignored by Git.
- No migration, authentication, cloud behavior, general economics chat, new AI
  intent, or new financial calculation was added.
