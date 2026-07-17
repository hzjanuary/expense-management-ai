# I01 MVP Release Readiness

## Purpose

Turn the completed 26-story MVP backlog into a coherent, locally runnable,
demonstrable, and release-ready Pocket Ledger AI MVP.

This initiative is planning-only. It defines the release hardening backlog and
objective gates before implementation starts.

## Current Implemented Baseline

Implemented backend behavior:

- FastAPI health, settings, logging, request IDs.
- SQLite, SQLAlchemy async sessions, and Alembic migrations.
- Deterministic money/category rules.
- Manual expense and income creation.
- Transaction list/filter API.
- Dashboard summary API.
- Local LLM provider abstraction and Ollama adapter.
- AI parse, clarification, persisted draft, and explicit confirmation flow.
- Monthly budget setup and computed budget remaining API.
- AI query spending, budget remaining, and spending breakdown intents.
- Transaction CSV/JSON export.
- Transaction soft delete with balance reversal.
- Clear AI history without deleting ledger transactions.

Implemented frontend behavior:

- Next.js App Router shell.
- Dashboard route.
- Recent Transactions UI backed by the transaction list API.
- Chat-to-Ledger UI backed by AI parse and confirm APIs.

## Included Stories

- US-701 Full-Stack Local Runtime.
- US-702 Live Dashboard Data Integration.
- US-703 Budget Setup and Progress UI.
- US-704 Insight Chat UI.
- US-705 Data Management UI.
- US-706 End-to-End MVP Demo.
- US-707 Release Hardening and Documentation.

## Recommended Execution Order

1. US-701 Full-Stack Local Runtime.
2. US-702 Live Dashboard Data Integration.
3. US-703 Budget Setup and Progress UI.
4. US-704 Insight Chat UI.
5. US-705 Data Management UI.
6. US-706 End-to-End MVP Demo.
7. US-707 Release Hardening and Documentation.

## Explicit Non-Goals

- Cloud deployment.
- Cloud LLM providers.
- Authentication or multi-user authorization.
- Bank-link integration.
- Desktop/mobile packaging.
- Transaction restore, hard delete, or bulk delete.
- Persistent multi-turn chat history.
- Scheduled cleanup jobs.
- New financial product features beyond proving the MVP scenario.

## Release Readiness Definition

The MVP is release-ready when a local user can run the full application, perform
the deterministic demo from `DEMO_SCRIPT.md`, and pass the gates in
`RELEASE_CRITERIA.md` without relying on cloud services or a real Ollama
installation.

Optional Ollama-enabled proof may be added behind an explicit environment gate,
but the normal release path must work with local fake/deterministic provider
behavior.

