# 0001 Local-First Stack

Date: 2026-07-11

## Status

Accepted

## Context

Pocket Ledger AI handles personal financial data and must satisfy a local-first privacy promise in the MVP. The stack must support deterministic validation, local persistence, a web dashboard, and local AI provider integration without requiring cloud services.

## Decision

Use a local-first MVP architecture with SQLite persistence, a FastAPI backend, a Next.js frontend, and local model providers. Use Python 3.12+, Pydantic v2, SQLAlchemy async, and Alembic on the backend. Use TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query or SWR on the frontend.

## Alternatives Considered

1. Cloud-first SaaS with managed database and hosted LLM.
2. Mobile-only native app.
3. Desktop-only app.
4. Fully frontend-only app with browser storage.

## Consequences

Positive:

- Stronger privacy story for MVP.
- Simple local setup and local data ownership.
- Works without cloud LLM providers.
- SQLite is sufficient for single-user local finance data.

Tradeoffs:

- Sync is deferred.
- Multi-device support is deferred.
- Packaging work may be needed later for desktop distribution.
- The repo will contain separate frontend and backend surfaces.

## Follow-Up

- Phase 1 stories should create only the runnable skeleton and health/database foundation.
- Desktop packaging should remain a later decision.

