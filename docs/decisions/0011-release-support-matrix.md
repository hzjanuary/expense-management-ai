# 0011 Release Support Matrix

Date: 2026-07-17

## Status

Accepted

## Context

Release readiness needs a bounded local support target. The repo currently runs
on Linux in this workspace, uses Python/FastAPI, Node/Next.js, SQLite, and an
optional local model provider. Without a support matrix, E2E and setup docs can
overpromise platform coverage.

## Decision

US-707 defines an MVP local support matrix covering:

## Validated

- Linux x86_64 on openSUSE Tumbleweed.
- Docker Engine `29.4.0-ce`.
- Docker Compose `5.3.1`.
- Backend local validation with Python `3.13.13`.
- Frontend local validation with Node `24.18.0` and npm `11.16.0`.
- Chromium browser execution through
  `mcr.microsoft.com/playwright:v1.61.1-noble`.
- Local single-user SQLite runtime with Alembic current revision `0004`.
- Default Ollama-disabled behavior with safe provider-unavailable responses.
- Deterministic fake-provider E2E behavior in isolated test runtime.

## Documented But Not Validated

- Docker Desktop on macOS.
- Docker Desktop on Windows/WSL2.
- Other Linux distributions.
- ARM64 hosts.
- Real Ollama-enabled full demo.
- Optional Ollama Compose profile beyond configuration validation.

## Unsupported For MVP Release

- Cloud deployment.
- Hosted database.
- Multi-user authentication or authorization.
- Cloud LLM providers.
- Automatic backups or synchronization.
- Production operations beyond local single-user runtime.

The support matrix describes what was actually validated rather than claiming
broad compatibility.

## Alternatives Considered

1. Document only the current Linux validation environment.
2. Claim generic macOS/Linux/Windows support without proof.
3. Defer support documentation until after deployment work.

## Consequences

Positive:

- Prevents release docs from overclaiming platform support.
- Gives US-707 objective documentation criteria.
- Separates local MVP support from future packaging or deployment work.

Tradeoffs:

- Some platforms remain unverified for MVP.
- More setup documentation is required before release signoff.
- Future support expansion must add platform-specific proof before changing a
  documented-but-not-validated environment to validated.

## Follow-Up

- US-707 accepted this decision based on the validation recorded in
  `docs/releases/MVP_RELEASE_VALIDATION.md`.
