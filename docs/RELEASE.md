# Pocket Ledger AI MVP Release

## Supported Release Path

The MVP release target is a local single-user web app running with Docker
Compose, FastAPI, Next.js, SQLite, and optional Ollama.

Primary validation command:

```bash
scripts/release-validate.sh
```

The command runs backend quality gates, isolated Alembic validation, frontend
quality gates, dependency audits, the full Playwright MVP demo twice, default
Compose runtime smoke, privacy-log smoke, and Harness checks.

## Prerequisites

- Linux x86_64. The release candidate was validated on openSUSE Tumbleweed.
- Docker Engine available to the current user without `sudo`.
- Docker Compose.
- Python 3.13 compatible with the backend virtual environment.
- Node.js and npm compatible with the frontend lockfile.

## Support Matrix

Validated:

- openSUSE Tumbleweed on Linux x86_64.
- Docker Engine `29.4.0-ce`.
- Docker Compose `5.3.1`.
- Python `3.13.13` for backend validation.
- Node `24.18.0` and npm `11.16.0` for frontend validation.
- Chromium through `mcr.microsoft.com/playwright:v1.61.1-noble`.
- Local single-user SQLite runtime.
- Ollama-disabled default behavior.

Documented but not validated:

- Docker Desktop on macOS.
- Docker Desktop on Windows/WSL2.
- Other Linux distributions.
- ARM64 hosts.
- Real Ollama-enabled full demo.

Unsupported for MVP release:

- Cloud deployment.
- Hosted database.
- Authentication or multi-user authorization.
- Cloud LLM providers.
- Automatic backups or synchronization.

## Local Startup

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Backend: `http://127.0.0.1:8010`
- Frontend: `http://127.0.0.1:3000`
- Dashboard: `http://127.0.0.1:3000/dashboard`

Stop without deleting local SQLite data:

```bash
docker compose down
```

Reset local Docker volume data explicitly:

```bash
docker compose down -v
```

## Validation Commands

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

Full browser demo:

```bash
scripts/e2e-mvp.sh
```

Runtime smoke:

```bash
scripts/runtime-smoke.sh
```

Privacy-log smoke:

```bash
scripts/privacy-log-smoke.sh
```

## Ollama

Ollama is optional. Default Compose startup uses
`POCKET_LEDGER_OLLAMA_ENABLED=false`, so AI requests return the documented safe
provider-unavailable response instead of fabricated data.

To connect to a host Ollama instance, configure `.env`:

```bash
POCKET_LEDGER_OLLAMA_ENABLED=true
POCKET_LEDGER_OLLAMA_BASE_URL=http://host.docker.internal:11434
POCKET_LEDGER_OLLAMA_MODEL=qwen2.5:3b
```

The optional Compose profile can start an Ollama service, but no model is
downloaded automatically:

```bash
POCKET_LEDGER_OLLAMA_ENABLED=true \
POCKET_LEDGER_OLLAMA_BASE_URL=http://ollama:11434 \
docker compose --profile ollama up --build
```

## Release Artifacts

Generated logs, browser reports, traces, screenshots, videos, downloads,
SQLite databases, and dependency audit JSON files are not committed. Factual
release evidence is recorded in `docs/releases/MVP_RELEASE_VALIDATION.md`.
