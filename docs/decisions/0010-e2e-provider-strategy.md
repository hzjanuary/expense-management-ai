# 0010 E2E Provider Strategy

Date: 2026-07-17

## Status

Proposed

## Context

The product supports local Ollama, but normal release validation must be
repeatable on machines without a model installed. The backend already supports
deterministic fake provider behavior for local/test mode and optional
Ollama-enabled integration proof.

## Decision

Propose that the normal E2E suite use deterministic fake/local provider
behavior. Real Ollama E2E proof may exist only as an optional, explicitly gated
validation path.

Normal E2E must prove:

- AI parse returns the canonical transaction draft,
- confirm creates the transaction through backend confirmation,
- insight answers are computed from database records,
- provider unavailability is surfaced safely where relevant.

Optional Ollama E2E must be skipped by default and enabled only with an
environment variable.

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

## Follow-Up

- US-706 should implement normal E2E with fake/local provider behavior.
- US-707 should document optional Ollama validation.

