# US-701 Full-Stack Local Runtime

## Status

implemented

## Lane

high-risk

## Product Contract

Start frontend and backend through one documented local workflow that applies
migrations, uses a controlled SQLite path, configures frontend/backend URLs
consistently, and keeps Ollama optional.

## Relevant Product Docs

- `docs/product/expense-ai/PRODUCT_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/initiatives/I01-mvp-release-readiness/RELEASE_CRITERIA.md`
- `docs/decisions/0001-local-first-stack.md`
- `docs/decisions/0002-llm-provider-abstraction.md`

## Dependencies

- US-101 Backend Bootstrap.
- US-102 Frontend Bootstrap.
- US-103 Local Database Setup.
- US-302 Ollama Provider Adapter.

## Acceptance Criteria

- One documented local workflow starts backend and frontend.
- Alembic migrations run before backend readiness is claimed.
- SQLite data persists in a controlled local path.
- Frontend and backend API URLs are configured consistently.
- Ollama remains optional.
- Ollama-disabled mode exposes a safe unavailable/degraded state where relevant.
- Optional Ollama runtime integration is documented and gated.
- Development health/readiness proof exists.
- No cloud deployment behavior is added.

## Design Notes

- Commands: local full-stack startup, migration, reset/seed if needed.
- Queries: backend health/readiness and provider status verification.
- API: existing health/provider/status surfaces; readiness endpoint only if
  required by the story implementation.
- Tables: existing SQLite/Alembic schema only.
- Domain rules: startup must not mutate financial records except explicit demo
  seed/reset commands if implemented in a later story.
- UI surfaces: dashboard load path and provider unavailable state.
- Runtime candidates: Docker Compose or equivalent local orchestration workflow.

## Explicit Out Of Scope

- Cloud deployment.
- Production containers.
- Hosted database.
- Cloud LLM providers.
- New product behavior.
- Frontend feature implementation beyond runtime wiring.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not primary for runtime orchestration. |
| Integration | Backend and frontend start through documented workflow; migrations apply first. |
| E2E | Dashboard route loads through full-stack local runtime. |
| Platform | Local runtime health/readiness and controlled SQLite path proof. |
| Release | Startup/reset instructions are documented and repeatable. |

## Harness Delta

- Added Docker Compose as the selected local runtime architecture.
- Added container build definitions, environment example, and smoke script.
- Decision `0008-local-runtime-orchestration` is accepted because the
  implementation selected Docker Compose.
- Docker runtime validation is complete on openSUSE with Docker daemon access
  available to the current user without `sudo`.
- Compose defaults to a production-like `POCKET_LEDGER_ENVIRONMENT=production`
  runtime so Ollama-disabled AI parse requests return provider unavailable
  instead of using the deterministic fake provider.

## Evidence

- `docker version` - passed; client/server `29.4.0-ce`, daemon accessible
  without `sudo`.
- `docker compose version` - passed; Docker Compose `5.3.1`.
- `docker info` - passed on openSUSE Tumbleweed; Docker root
  `/var/lib/docker`.
- `docker compose down --remove-orphans` - passed; no volume deletion used.
- `docker compose config` - passed.
- `docker compose --profile ollama config` - passed; optional Ollama profile is
  valid and not part of default startup.
- `docker compose build --no-cache` - passed; backend and frontend images built
  successfully, and no Ollama model download occurred.
- `docker compose up -d` - passed; backend and frontend containers reached
  healthy status.
- `curl -i http://127.0.0.1:8010/health` - passed with `HTTP 200` and
  `{"status":"ok"}`.
- `curl -I http://127.0.0.1:3000/dashboard` - passed with `HTTP 200`.
- `curl -i http://127.0.0.1:3000/api/transactions` - passed with `HTTP 200`
  and a valid transaction-list envelope.
- `docker compose exec -T backend alembic current` - passed; reported
  `0004 (head)`.
- `POST /api/v1/ai/parse` with Ollama disabled and production-like Compose
  defaults - passed with `HTTP 503` and
  `{"detail":"LLM provider is unavailable"}` while `/health` remained healthy.
- SQLite persistence proof - passed. Created transaction
  `75b041a2-9278-450b-8fc2-7ad3979860a3` with description
  `US-701 persistence proof`, restarted with `docker compose down` then
  `docker compose up -d`, and verified the same transaction remained queryable.
- `docker compose exec -T backend sh -lc 'ls -la /app/data && test -f /app/data/pocket_ledger.db'`
  - passed; SQLite file exists in the persistent container data path.
- `scripts/runtime-smoke.sh` - passed. The script validates Compose config,
  builds and starts the stack, checks backend health, dashboard reachability,
  frontend transaction proxy reachability, Alembic head state, SQLite file
  presence, controlled transaction creation, service restart, and persistence.
- `cd backend && .venv/bin/pytest` - passed, 238 passed, 1 skipped.
- `cd backend && .venv/bin/ruff check .` - passed.
- `cd backend && .venv/bin/black --check .` - passed.
- `cd backend && .venv/bin/mypy app` - passed.
- `cd frontend && npm ci` - passed; reported two moderate audit findings for
  later triage, no forced remediation applied.
- `cd frontend && npm run lint` - passed.
- `cd frontend && npm run typecheck` - passed.
- `cd frontend && npm run build` - passed.
- `docker compose down` - passed after evidence capture; named volume preserved.
