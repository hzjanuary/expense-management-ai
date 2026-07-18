# 0010 E2E Provider Strategy

Date: 2026-07-17

## Status

Accepted

## Context

The product supports local Ollama, but normal release validation must be
repeatable on machines without a model installed. The backend already supports
deterministic fake provider behavior for local/test mode and optional
Ollama-enabled integration proof.

## Decision

The normal E2E suite uses deterministic fake/local provider behavior. Real
Ollama E2E proof may exist only as an optional, explicitly gated validation
path.

Normal E2E must prove:

- AI parse returns the canonical transaction draft,
- confirm creates the transaction through backend confirmation,
- insight answers are computed from database records,
- provider unavailability is surfaced safely where relevant.

Optional Ollama E2E must be skipped by default and enabled only with an
environment variable.

US-706 implements this through the isolated E2E Compose overlay and runner:

- `compose.e2e.yaml` sets `POCKET_LEDGER_ENVIRONMENT=test`,
  `POCKET_LEDGER_OLLAMA_ENABLED=false`, and an E2E-specific SQLite database
  path.
- `scripts/e2e-mvp.sh` runs the isolated stack under Compose project
  `pocket-ledger-e2e`, seeds deterministic local data, and executes Playwright
  without requiring Ollama.
- The default production-like Compose runtime remains unchanged:
  `POCKET_LEDGER_ENVIRONMENT=production` with Ollama disabled returns the safe
  provider-unavailable response for AI parse requests.

## Alternatives Considered

1. Deterministic fake provider for normal E2E and optional Ollama smoke.
2. Require real Ollama for all E2E.
3. Mock frontend network calls instead of running the backend.
4. Disable AI-related E2E until a real model is available.

## Consequences

Positive:

- Keeps release proof deterministic and accessible.
- Preserves the local-model product direction without making it a CI/local
  prerequisite.
- Aligns with the provider abstraction and existing backend tests.

Tradeoffs:

- Fake provider E2E does not prove model quality.
- Optional Ollama smoke must be documented separately.
- UI copy must clearly handle Ollama-disabled/unavailable states.
- The E2E seed/reset path must remain guarded to test/E2E environments and must
  not become a public API.

## Follow-Up

- US-706 implemented normal E2E with fake/local provider behavior.
- US-707 should document optional Ollama validation.
