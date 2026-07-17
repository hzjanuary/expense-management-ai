# US-701 Full-Stack Local Runtime

## Status

planned

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

May add local runtime commands to release documentation and durable story
verification once implementation exists.

## Evidence

TBD.

