# 0008 Local Runtime Orchestration

Date: 2026-07-17

## Status

Proposed

## Context

The MVP now has separate FastAPI backend and Next.js frontend surfaces, a local
SQLite database, Alembic migrations, optional Ollama integration, and a
deterministic fake provider path. Release readiness requires one repeatable
local workflow that can start the stack, apply migrations, and use a controlled
data path without introducing cloud deployment.

## Decision

Propose a local-only orchestration workflow for US-701. The implementation
story should choose between Docker Compose and a script-based equivalent, but
the workflow must:

- start backend and frontend together,
- run Alembic migrations before readiness,
- use an explicit local SQLite path,
- keep Ollama optional and disabled by default,
- expose health/readiness proof,
- avoid cloud deployment or production container commitments.

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
- Script-only workflow may be less isolated across machines.
- The final choice needs platform documentation for supported local environments.

## Follow-Up

- US-701 should make the final orchestration choice and update this decision to
  Accepted or Superseded.
- US-707 should validate the chosen workflow on supported local environments.

