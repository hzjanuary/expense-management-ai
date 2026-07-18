# Test Matrix

This file maps product behavior to proof.

No product behavior has been defined or implemented yet. Do not mark a row
implemented until tests or validation evidence exist.

## Status Values

| Status | Meaning |
| --- | --- |
| planned | Accepted as intended behavior, not implemented |
| in_progress | Actively being built |
| implemented | Implemented and proof exists |
| changed | Contract changed after earlier implementation |
| retired | No longer part of the product contract |

## Matrix

| Story | Contract | Unit | Integration | E2E | Platform | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| US-001 | Product contract docs exist and preserve accepted spec intent | no | no | no | yes | planned | none |
| US-002 | MVP story backlog exists with validation expectations | no | yes | no | yes | planned | none |
| US-003 | Architecture decisions are recorded from template | no | yes | no | yes | planned | none |
| US-101 | Backend health and typed settings foundation | yes | yes | no | yes | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; live `curl /health` smoke passed |
| US-102 | Frontend shell with dashboard/chat/history/budget placeholders | yes | no | yes | yes | implemented | `npm install`; `npm run lint`; `npm run typecheck`; `npm run build`; local `/dashboard` smoke returned `HTTP 200` |
| US-103 | Local SQLite database and migrations foundation | yes | yes | no | yes | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; Alembic current/upgrade/downgrade/upgrade on temp SQLite DB |
| US-201 | Money uses integer minor units and categories are seeded | yes | no | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-202 | Manual expense creation decreases account balance | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; Alembic upgrade/downgrade/upgrade on isolated SQLite DB |
| US-203 | Manual income creation increases account balance | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-204 | Transaction list supports filters and excludes soft deletes | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-205 | Dashboard totals are computed from transactions | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-301 | LLM provider interface returns structured drafts/status only | yes | no | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-302 | Ollama adapter supports local structured output and graceful failure | yes | yes | no | yes | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; real Ollama smoke skipped unless `POCKET_LEDGER_RUN_OLLAMA_INTEGRATION=1` |
| US-303 | AI parse returns a draft for Vietnamese shorthand without ledger mutation | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-304 | Confirmed AI draft creates exactly one transaction | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; Alembic current/upgrade/downgrade/upgrade on isolated SQLite DB |
| US-305 | Low-confidence AI output asks clarification and does not mutate ledger | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-401 | Monthly and category budgets are validated and persisted | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; Alembic current/upgrade/downgrade/upgrade on isolated SQLite DB |
| US-402 | Category remaining budget is computed from configured budgets and transactions | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-403 | Recent Transactions UI reads transaction list and supports refresh | yes | yes | yes | yes | implemented | `npm run lint`; `npm run typecheck`; `npm run build`; local `/dashboard` smoke returned `HTTP 200` |
| US-404 | Chat-to-ledger UI records canonical expense after confirmation | yes | yes | yes | yes | implemented | `npm run lint`; `npm run typecheck`; `npm run build`; local `/dashboard` smoke returned `HTTP 200` |
| US-501 | Spending questions answer from DB totals | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-502 | Budget remaining questions use configured budgets and no-fabrication rules | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-503 | Spending breakdown questions compute top category deterministically | yes | yes | no | no | implemented | `pytest tests/test_ai_spending_breakdown_api.py`; `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-601 | Export transactions as user-triggered CSV/JSON | yes | yes | no | no | implemented | `pytest tests/test_transaction_export_api.py`; `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-602 | Soft delete excludes transactions from lists and totals | yes | yes | no | no | implemented | `pytest tests/test_soft_delete_transaction_api.py`; `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-603 | Clear AI history removes AI records without deleting transactions | yes | yes | no | no | implemented | `pytest tests/test_clear_ai_history_api.py`; `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-701 | Full-stack local runtime starts backend/frontend with migrations and optional Ollama | no | yes | no | yes | implemented | `docker compose config`; `docker compose --profile ollama config`; `docker compose build --no-cache`; `docker compose up -d`; backend/frontend health checks; `curl /health`; `curl /dashboard`; frontend transaction proxy; `alembic current` at `0004 (head)`; Ollama-disabled parse returned provider unavailable; SQLite persistence proof across restart; `scripts/runtime-smoke.sh`; backend pytest/ruff/black/mypy; frontend npm ci/lint/typecheck/build |
| US-702 | Dashboard shows live backend totals and budget remaining state | yes | yes | yes | no | implemented | `npm ci`; `npm test` (3 files, 10 tests); `npm run lint`; `npm run typecheck`; `npm run build`; backend `pytest`; `docker compose up -d --build`; frontend dashboard summary and budget remaining proxy curls returned `HTTP 200` with `Cache-Control: no-store`; `/dashboard` returned `HTTP 200`; existing transaction proxy returned `HTTP 200`; `scripts/runtime-smoke.sh` |
| US-703 | Budget setup and progress UI uses existing budget APIs | yes | yes | yes | no | implemented | `npm ci`; `npm test` (5 files, 22 tests); `npm run lint`; `npm run typecheck`; `npm run build`; backend `pytest`; `docker compose up -d --build`; frontend monthly budget setup GET/PUT proxy curls returned `HTTP 200` with `Cache-Control: no-store`; budget remaining proxy reflected saved budget; `/dashboard` returned `HTTP 200`; `scripts/runtime-smoke.sh` |
| US-704 | Insight chat UI shows DB-grounded spending and budget answers | yes | yes | yes | no | implemented | `npm ci`; `npm test` (7 files, 34 tests); `npm run lint`; `npm run typecheck`; `npm run build`; backend `pytest`; `docker compose up -d --build`; frontend insight proxies returned safe Ollama-disabled `HTTP 503` with `Cache-Control: no-store`; `/dashboard` returned `HTTP 200`; backend `/health` returned `HTTP 200`; `scripts/runtime-smoke.sh` |
| US-705 | Data management UI supports export, soft delete, and clear AI history | yes | yes | yes | no | implemented | `npm ci`; `npm test` (9 files, 49 tests); `npm run lint`; `npm run typecheck`; `npm run build`; backend `pytest` (238 passed, 1 skipped); `docker compose up -d --build`; CSV/JSON export proxies returned `HTTP 200` with attachment headers; frontend soft-delete proxy returned `HTTP 200` and repeat returned `HTTP 409`; deleted transaction excluded from active list/export and backend balance reversed; clear-history proxy returned `HTTP 200` then idempotent zero-count repeat; `/dashboard` and `/health` returned `HTTP 200`; rendered dashboard HTML contained data-management sections; `scripts/runtime-smoke.sh` |
| US-706 | Full E2E MVP demo proves the deterministic release flow | no | yes | yes | yes | planned | none |
| US-707 | Release hardening validates quality gates and documentation | no | yes | yes | yes | planned | none |

## Evidence Rules

- Unit proof covers pure domain and application rules.
- Integration proof covers backend enforcement, data integrity, provider
  behavior, jobs, or service contracts.
- E2E proof covers user-visible browser flows.
- Platform proof covers only shell, deployment, mobile, desktop, or runtime
  behavior that cannot be proven in lower layers.
- A story can be implemented without every proof column if the story packet
  explains why.
