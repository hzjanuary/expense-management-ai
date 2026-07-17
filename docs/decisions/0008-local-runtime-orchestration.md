# 0008 Local Runtime Orchestration

Date: 2026-07-17

## Status

Accepted

## Context

The MVP now has separate FastAPI backend and Next.js frontend surfaces, a local
SQLite database, Alembic migrations, optional Ollama integration, and a
deterministic fake provider path. Release readiness requires one repeatable
local workflow that can start the stack, apply migrations, and use a controlled
data path without introducing cloud deployment.

## Decision

Use Docker Compose as the primary local-only orchestration workflow for US-701.
The workflow:

- start backend and frontend together,
- run Alembic migrations before readiness,
- use an explicit local SQLite path,
- keep Ollama optional and disabled by default,
- expose health/readiness proof,
- avoid cloud deployment or production container commitments.

The selected implementation uses:

- `compose.yaml` at the repository root,
- a FastAPI backend image with an entrypoint that runs `alembic upgrade head`
  before starting Uvicorn,
- a Next.js frontend image using server-side proxy routes,
- a persistent Docker named volume for `/app/data`,
- optional Ollama through a Compose profile and host-Ollama documentation.

## Alternatives Considered

1. Docker Compose for backend, frontend, SQLite volume, and optional Ollama.
2. Shell/PowerShell scripts that run backend and frontend directly.
3. Leave backend and frontend as separately documented commands.
4. Add production deployment configuration.

## Consequences

Positive:

- Gives E2E and demo work one startup target.
- Makes local data location and migration order explicit.
- Keeps release proof local-first and cloud-free.

Tradeoffs:

- Docker Compose adds one more local prerequisite if selected.
- Docker daemon access is required for runtime validation.
- Script-only direct host startup remains useful for development but is not the
  primary release-readiness workflow.
- US-707 still needs platform documentation for supported local environments.

## Follow-Up

- US-701 runtime proof must run on a machine where the user can access the
  Docker daemon.
- US-707 should validate the chosen workflow on supported local environments.
