# Pocket Ledger AI

A local-first AI-assisted personal expense manager.

Pocket Ledger AI is a single-user local MVP for tracking income, expenses,
budgets, and spending insights. It combines a Next.js frontend, FastAPI backend,
SQLite storage, and optional local Ollama integration. The current state is a
local MVP release candidate with documented limitations, not a production cloud
or multi-user banking platform.

## Key Features

- Manual expense and income creation through the backend API.
- AI transaction parsing with typed drafts.
- Explicit draft confirmation before any AI-created transaction reaches the
  ledger.
- Multi-page frontend with overview, transactions, budgets, assistant, and
  settings pages.
- Live dashboard overview for account balance, monthly income, monthly expense,
  budget progress, recent transaction preview, and quick actions.
- Monthly total budgets and expense-category budgets.
- Spending query, budget remaining, and spending breakdown insight UI.
- CSV and JSON transaction export.
- Transaction soft deletion with deterministic account-balance reversal.
- Local AI draft/history clearing without deleting confirmed transactions.
- Docker Compose full-stack runtime with persistent SQLite storage.
- Automated browser-driven MVP validation with Playwright.

## Safety And Privacy Model

The AI provider may create typed drafts or classify queries. Only deterministic
backend application commands may mutate financial records.

AI-created transactions require explicit user confirmation. Spending totals,
budget remaining values, dashboard metrics, and exports are calculated from
persisted SQLite ledger and budget records, not from generated model text.
Money is stored and transported as integer minor units, such as VND dong amounts,
and the frontend does not calculate authoritative balances or budget totals.

Data remains local by default. The production-like Compose runtime starts with
Ollama disabled, so AI requests return a safe provider-unavailable response until
a local provider is explicitly enabled. Clearing AI history removes locally
stored AI draft/history rows, including raw prompt text and provider metadata,
but it does not delete confirmed ledger transactions. Soft deletion keeps the
transaction row stored locally, sets `deleted_at`, excludes it from active views,
and reverses its account-balance effect.

This MVP does not include authentication, cloud sync, multi-device consistency,
or automatic backups.

## Architecture

```text
Browser
  -> Next.js frontend
  -> same-origin frontend proxy routes
  -> FastAPI backend
  -> SQLite

Optional:
  -> local Ollama provider
```

The backend uses Alembic migrations for SQLite schema management. Tests use a
deterministic fake provider where model behavior must be predictable; the normal
production-like Compose runtime keeps Ollama optional and disabled by default.
Vitest and React Testing Library cover frontend components and proxy routes.
Playwright covers the browser-level MVP demo. Harness documents product
contracts, story evidence, decisions, and validation expectations.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for deeper architecture notes.

## Prerequisites

The primary startup path requires:

- Git.
- Docker Engine.
- Docker Compose.
- Enough local disk space for backend, frontend, and Playwright images.

Optional real AI behavior requires a local Ollama runtime and a compatible local
model.

Validated release environment:

- openSUSE Tumbleweed.
- Linux x86_64.
- Docker Engine `29.4.0-ce`.
- Docker Compose `5.3.1`.

Other Linux distributions, Docker Desktop on macOS or Windows/WSL2, ARM64 hosts,
and real Ollama-enabled full demos may work, but they are not validated to the
same level for this release candidate.

## Quick Start

```bash
git clone https://github.com/hzjanuary/expense-management-ai.git
cd expense-management-ai
cp .env.example .env
docker compose up --build
```

Expected local URLs:

- Dashboard: `http://127.0.0.1:3000/dashboard`
- Frontend: `http://127.0.0.1:3000`
- Backend API: `http://127.0.0.1:8010`
- Health check: `http://127.0.0.1:8010/health`

Basic checks:

```bash
docker compose ps
curl http://127.0.0.1:8010/health
```

Stop while preserving local SQLite data:

```bash
docker compose down
```

Explicit destructive reset:

```bash
docker compose down -v
```

`docker compose down -v` removes the local Docker volumes, including the
SQLite ledger volume. Use it only when you intentionally want to reset local
data.

## Optional Ollama Setup

Default startup works without Ollama:

```text
POCKET_LEDGER_OLLAMA_ENABLED=false
```

With Ollama disabled, AI requests fail safely with provider-unavailable behavior
instead of fabricated financial data. `/health` remains independent from
Ollama.

The example environment uses:

```text
POCKET_LEDGER_OLLAMA_BASE_URL=http://host.docker.internal:11434
POCKET_LEDGER_OLLAMA_MODEL=qwen3:4b-instruct
POCKET_LEDGER_OLLAMA_TIMEOUT_SECONDS=10
```

To connect the backend container to a host Ollama instance, install and run
Ollama on the host, make sure the configured model is available, then set:

```bash
ollama pull qwen3:4b-instruct
ollama list
ollama serve
```

```text
POCKET_LEDGER_OLLAMA_ENABLED=true
POCKET_LEDGER_OLLAMA_BASE_URL=http://host.docker.internal:11434
POCKET_LEDGER_OLLAMA_MODEL=qwen3:4b-instruct
```

Linux hosts may need Docker's host-gateway support, which is already configured
in `compose.yaml` for the backend service. The optional Compose profile can also
start an Ollama service:

```bash
POCKET_LEDGER_OLLAMA_ENABLED=true \
POCKET_LEDGER_OLLAMA_BASE_URL=http://ollama:11434 \
docker compose --profile ollama up --build
```

No model is downloaded automatically. Real Ollama quality depends on the local
model and runtime.

## Main User Flows

### Add A Manual Transaction

Manual transaction creation is available through the backend API. With the
Compose stack running:

```bash
curl -X POST "http://127.0.0.1:8010/api/v1/transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount_minor": 35000,
    "currency": "VND",
    "category_slug": "food",
    "description": "manual lunch",
    "occurred_at": "2026-07-17T12:00:00+07:00",
    "source": "manual"
  }'
```

### Add A Transaction With AI

Open `http://127.0.0.1:3000/assistant` and enter:

```text
Hôm nay tôi tiêu 35k vào ăn trưa
```

The app shows a typed draft for review. The ledger changes only after you
explicitly confirm the draft.

### Configure A Budget

Open `http://127.0.0.1:3000/budgets`, select the month, and configure:

```text
Total monthly budget: 5,000,000 VND
Food budget: 2,000,000 VND
```

Budget progress refreshes from backend budget and transaction records after the
save completes.

### Ask Financial Questions

The assistant page supports these deterministic MVP insight examples:

```text
Tháng này tôi ăn uống hết bao nhiêu?
Còn bao nhiêu tiền ăn tháng này?
Tuần này tôi tiêu nhiều nhất vào mục nào?
```

The provider classifies supported intent details. Amounts, counts, remaining
budget, percentages, and top categories come from backend database queries.

### Export Data

Open `http://127.0.0.1:3000/transactions` to download transaction exports as
CSV or JSON. Export filters include format, month, category, type, and text
search. Exports use an explicit field allowlist and do not include AI provider
metadata, deleted timestamps, parser confidence, request IDs, or logs.

### Remove An Incorrect Transaction

Open `http://127.0.0.1:3000/transactions` and use the transaction delete action
in Recent Transactions. The confirmation explains that this is a soft delete:
the row is retained locally, active ledger views hide it, and the backend
reverses its account-balance effect. Repeated delete attempts are handled
without reversing the balance twice.

### Clear AI History

Open `http://127.0.0.1:3000/settings` and use the privacy action to clear
locally stored AI draft/history records. Confirmed transactions, account
balances, budgets, exports, and active ledger views remain intact.

## Development Without Docker

The Docker Compose workflow is the recommended full-stack path. Local backend
and frontend development can also run directly.

Backend setup and validation:

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

Backend quality commands:

```bash
cd backend
.venv/bin/pytest
.venv/bin/ruff check .
.venv/bin/black --check .
.venv/bin/mypy app
```

Frontend setup and validation:

```bash
cd frontend
npm ci
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

See [backend/README.md](backend/README.md) and
[frontend/README.md](frontend/README.md) for component-specific details.

## Testing

Backend:

```bash
cd backend
.venv/bin/pytest
.venv/bin/ruff check .
.venv/bin/black --check .
.venv/bin/mypy app
```

Frontend:

```bash
cd frontend
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

Runtime smoke:

```bash
scripts/runtime-smoke.sh
```

End-to-end MVP demo:

```bash
scripts/e2e-mvp.sh
```

The E2E command uses an isolated Compose project, isolated SQLite volume, and
deterministic fake provider. It does not require real Ollama and does not delete
normal development data.

Complete release validation:

```bash
scripts/release-validate.sh
```

The release command coordinates static configuration checks, backend quality
gates, isolated Alembic validation, frontend quality gates, dependency/security
review, accessibility-enabled Playwright E2E, default Compose runtime smoke,
privacy-log smoke, and Harness checks.

## Release Validation Status

Latest report: [docs/releases/MVP_RELEASE_VALIDATION.md](docs/releases/MVP_RELEASE_VALIDATION.md).

Release recommendation: Ready with documented limitations.

Latest recorded evidence:

- Backend: `241 passed, 1 skipped, 1 warning`; Ruff, Black, and mypy passed.
- Frontend: `49 tests` across `9 files` passed; lint, typecheck, and build
  passed.
- Alembic: isolated base/head round trip passed; final current revision
  `0004 (head)`.
- E2E: the complete Playwright MVP demo passed twice from clean isolated state.
- Accessibility: no critical or serious axe violations in the covered dashboard,
  budget, AI draft, insight, delete dialog, and clear-history states.
- Privacy logs: controlled raw AI text, transaction description, and provider
  payload markers were absent from inspected Compose logs.
- Support matrix: openSUSE Tumbleweed on Linux x86_64 with Docker Engine
  `29.4.0-ce` and Docker Compose `5.3.1` is validated.

Remaining dependency findings and platform boundaries are documented in the
release report and known limitations.

## Data Persistence And Reset

The Compose backend stores SQLite data at `/app/data/pocket_ledger.db` inside a
named Docker volume. `docker compose down` stops the stack and preserves that
volume. `docker compose down -v` removes the volume and deletes local ledger
data.

There is no automatic backup in this MVP. Export CSV or JSON before destructive
local resets if you need to keep a copy of transaction data.

The E2E runner uses a separate Compose project and isolated SQLite volume. Its
cleanup removes only the isolated E2E volume, not the normal development data
volume.

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for detailed recovery
steps.

Common checks:

- Docker permission denied: add your user to the `docker` group, then log out
  and back in before retrying.
- Docker daemon not running: start Docker, then run `docker info`.
- Ports already in use: set `BACKEND_PORT` or `FRONTEND_PORT` in `.env`, or stop
  the conflicting local process.
- Frontend cannot reach backend: verify `BACKEND_INTERNAL_URL=http://backend:8010`
  in the Compose environment.
- Migration startup failure: inspect `docker compose logs backend` and
  `docker compose exec backend alembic current`.
- Clean local data reset: run `docker compose down -v` only after you are sure
  you want to delete the local SQLite volume.
- Ollama unavailable: keep `POCKET_LEDGER_OLLAMA_ENABLED=false` for safe
  unavailable behavior, or verify the host model and base URL.

## Known Limitations

See [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) for the maintained
list.

Important MVP limits:

- Local single-user application only.
- No authentication or authorization.
- No cloud sync, hosted database, or multi-device consistency.
- No automatic backups.
- No transaction restore or hard-delete UI.
- No persistent conversational chat history.
- No general-purpose economics chat; the assistant routes only supported
  transaction and insight intents.
- SQLite has expected local concurrency limits.
- Validated platform coverage is limited to the documented Linux Docker
  environment.
- Real Ollama behavior is model-dependent and not validated for the full demo.
- Frontend npm audit and backend local-tooling findings remain documented release
  risks.

## Project Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Product contract](docs/product/expense-ai/PRODUCT_CONTRACT.md)
- [API contract](docs/product/expense-ai/API_CONTRACT.md)
- [Domain model](docs/product/expense-ai/DOMAIN_MODEL.md)
- [LLM contract](docs/product/expense-ai/LLM_CONTRACT.md)
- [Privacy and security](docs/product/expense-ai/PRIVACY_SECURITY.md)
- [UX flows](docs/product/expense-ai/UX_FLOWS.md)
- [Release guide](docs/RELEASE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [MVP release validation report](docs/releases/MVP_RELEASE_VALIDATION.md)
- [Test matrix](docs/TEST_MATRIX.md)
- [Changelog](CHANGELOG.md)
- [Harness guide](docs/HARNESS.md)
- [Feature intake](docs/FEATURE_INTAKE.md)
- [Tool registry](docs/TOOL_REGISTRY.md)
- [Release-readiness initiative](docs/initiatives/I01-mvp-release-readiness/README.md)

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for release notes and
[docs/releases/MVP_RELEASE_VALIDATION.md](docs/releases/MVP_RELEASE_VALIDATION.md)
for the latest validation evidence.

## License

No license file is currently provided in this repository.
