# MVP Release Validation Report

Date: 2026-07-18

Worktree reference:

- Base commit before US-707: `ff79f63`
- Validation includes current US-707 worktree changes.

## Environment

| Item | Value |
| --- | --- |
| OS | openSUSE Tumbleweed |
| Architecture | x86_64 |
| Docker Engine | 29.4.0-ce |
| Docker Compose | 5.3.1 |
| Backend Python | 3.13.13 |
| Backend pip in local venv | 26.0.1 |
| Frontend Node | 24.18.0 |
| Frontend npm | 11.16.0 |
| Browser proof | Chromium through `mcr.microsoft.com/playwright:v1.61.1-noble` |

## Release Command

```bash
scripts/release-validate.sh
```

Result: passed.

## Backend Quality

Commands:

```bash
cd backend
.venv/bin/pytest
.venv/bin/ruff check .
.venv/bin/black --check .
.venv/bin/mypy app
```

Result:

- `pytest`: `241 passed, 1 skipped, 1 warning`.
- `ruff check .`: passed.
- `black --check .`: passed (`75 files would be left unchanged`).
- `mypy app`: passed (`44 source files`).

Skipped test:

- Ollama integration smoke remains gated and skipped unless explicitly enabled.

Warning reviewed:

- Starlette deprecation warning from FastAPI/Starlette `TestClient` import path.
  It does not affect the MVP runtime path and remains a future dependency
  maintenance item.

## Alembic Validation

The release command created an isolated temporary SQLite database and ran:

```bash
alembic upgrade head
alembic current
alembic downgrade base
alembic upgrade head
alembic current
```

Result:

- Upgrade from base to head passed.
- Downgrade to base passed.
- Re-upgrade to head passed.
- Final current revision: `0004 (head)`.
- Normal development database was not used or deleted.

## Frontend Quality

Commands:

```bash
cd frontend
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

Result:

- `npm ci`: passed.
- `npm test`: `9 files`, `49 tests` passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.

NPM noted two moderate audit findings and allow-scripts review prompts for
packages with install scripts. No forced dependency remediation was applied.

## E2E And Accessibility

Command:

```bash
scripts/e2e-mvp.sh
scripts/e2e-mvp.sh
```

Result:

- First clean isolated run: passed, Playwright `1 passed`.
- Second clean isolated run: passed, Playwright `1 passed`.
- Both runs used project `pocket-ledger-e2e`, isolated SQLite volume
  `pocket-ledger-e2e-data`, deterministic fake provider, and no real Ollama.
- The isolated E2E volume was removed after each run.
- Normal development SQLite volume was not removed.

Accessibility proof:

- Axe checks run during the browser demo at these states:
  initial dashboard, budget setup form, AI draft review, insight result,
  transaction delete dialog, and clear AI history dialog.
- Result: no critical or serious violations.

Failure artifacts:

- Playwright traces, screenshots, videos, reports, and downloads are configured
  on failure and ignored under `frontend/playwright-report/`,
  `frontend/test-results/`, and `frontend/e2e-artifacts/`.

## Runtime Smoke

Command:

```bash
scripts/runtime-smoke.sh
```

Result:

- `docker compose config`: passed.
- `docker compose --profile ollama config`: passed.
- Backend and frontend images built.
- Backend health became reachable.
- Frontend dashboard became reachable.
- Frontend transaction proxy became reachable.
- Alembic current: `0004 (head)`.
- SQLite file existed at `/app/data/pocket_ledger.db`.
- A controlled transaction persisted across service restart.
- Runtime smoke passed.

Default Ollama-disabled behavior:

- Default production-like Compose keeps `POCKET_LEDGER_OLLAMA_ENABLED=false`.
- AI parse returns safe provider-unavailable behavior instead of fabricated
  data.
- `/health` remains independent from Ollama.

## Privacy Logging

Command:

```bash
scripts/privacy-log-smoke.sh
```

Result: passed.

The smoke used an isolated Compose project and searched backend/frontend logs
after controlled parse, transaction creation, and export operations.

Absent from inspected runtime logs:

- Raw AI chat text.
- Controlled transaction description.
- Provider/draft payload text.

Scope:

- The check covers Docker Compose runtime logs for controlled operations.
- It does not claim to inspect shell history, external logs, operating-system
  logs, browser cache, or model-provider internals.

## Dependency And Security Review

### Frontend

Commands:

```bash
cd frontend
npm audit
npm audit --json
```

Findings:

| Package | Severity | Direct | Runtime surface | Remediation | Decision |
| --- | --- | --- | --- | --- | --- |
| `next` via nested `postcss` | moderate | yes | Next.js build/runtime dependency | npm suggests `npm audit fix --force`, which would install `next@9.3.3` | Accepted temporarily |
| `postcss <8.5.10` under `next` | moderate | no | Transitive dependency nested inside Next.js | Requires upstream compatible Next.js remediation; npm's available path is breaking | Accepted temporarily |

Rationale:

- The available npm remediation is a forced breaking path and would downgrade
  the framework outside US-707 scope.
- The full frontend quality gates, E2E, and runtime smoke passed.
- This remains a documented dependency risk for a future maintenance story.

### Backend

Tool:

- `pip-audit`, installed in a temporary audit virtual environment.

Command shape:

```bash
python -m pip_audit --path backend/.venv/lib/python*/site-packages
```

Findings:

| Package | Severity | Runtime surface | Remediation | Decision |
| --- | --- | --- | --- | --- |
| `pip 26.0.1` | reported vulnerabilities `PYSEC-2026-196`, `PYSEC-2026-2875`, `PYSEC-2026-2876` | Local development virtualenv tooling | Upgrade pip to `26.1.2` or later | Accepted as local tooling risk |

Notes:

- The runtime Docker image upgrades pip during build and reported installation
  with `pip 26.1.2`.
- Application runtime dependencies in the audit output had no reported
  vulnerabilities.
- The editable local package `pocket-ledger-ai-backend` was skipped because it
  is not published on PyPI.

## Container And Configuration Review

- Backend runtime image: `python:3.13-slim`, non-root `app` user.
- Frontend runtime image: `node:22-alpine`, non-root `node` user.
- E2E runner image: official Playwright image, runs as root inside isolated
  test container.
- Backend and frontend base images are version-tagged rather than digest-pinned.
- Optional Ollama profile uses `ollama/ollama:latest` and is not part of
  default startup.
- `.env`, SQLite databases, virtualenvs, `node_modules`, caches, Playwright
  reports, test results, and E2E artifacts are excluded by ignore files.
- Backend exposes host port `8010`; frontend exposes host port `3000`.
- Ollama service is behind optional Compose profile and is not exposed by
  default.
- No mandatory model download occurs during startup or validation.

## Git And Harness

Commands:

```bash
git diff --check
scripts/bin/harness-cli query matrix
scripts/bin/harness-cli query stats
```

Result:

- `git diff --check`: passed.
- Harness matrix query: passed.
- Harness stats query: passed.

## Remaining Risks

- Frontend npm audit has two moderate findings in `next`/nested `postcss`.
- Backend local development `.venv` has vulnerable `pip 26.0.1`; runtime image
  upgrades pip during build.
- Real Ollama full demo is documented but not validated for this release
  candidate.
- Docker Desktop on macOS/Windows, other Linux distributions, and ARM64 hosts
  are not validated.
- SQLite remains a local single-user storage choice with expected concurrency
  limits.
- No authentication, cloud sync, automatic backups, restore UI, hard delete UI,
  or persistent chat history is included.

## Recommendation

Ready with documented limitations.

The local MVP satisfies the release-readiness gates for the validated
openSUSE/Linux Docker environment. The remaining dependency findings and
platform limitations are documented and do not block the local single-user MVP
release candidate.
