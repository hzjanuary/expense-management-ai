# 0002 LLM Provider Abstraction

Date: 2026-07-11

## Status

Accepted

## Context

The MVP needs local AI parsing, but provider details must not leak into ledger domain logic or API mutation rules. Ollama is the first local provider, while llama.cpp-compatible servers or future local SLMs may be added later.

## Decision

Create an `LlmProvider` interface for structured parsing and provider status. Implement Ollama first behind that interface. Tests should use fake providers to prove application behavior without requiring a local model.

## Alternatives Considered

1. Direct Ollama calls inside API controllers.
2. Cloud provider first.
3. llama.cpp server only.

## Consequences

Positive:

- Provider failure does not break domain logic.
- Provider implementations can be swapped or expanded.
- Tests can use deterministic fake provider responses.
- API and application layers can normalize provider errors.

Tradeoffs:

- Slightly more upfront design.
- The provider contract must stay strict and versioned through product docs/tests.
- Integration tests with real Ollama may be optional/skippable.

## Follow-Up

- Phase 3 should define the interface before adding the Ollama adapter.
- Provider status must be exposed through the API and UI.

