# US-302 Ollama Provider Adapter

## Status

planned

## Lane

high-risk

## Product Contract

Implement Ollama as the first local provider behind the provider interface, with graceful unavailable behavior.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/decisions/0002-llm-provider-abstraction.md`

## Acceptance Criteria

- Ollama endpoint URL is configurable.
- Model name is configurable.
- Adapter sends JSON Schema format request.
- Adapter handles unavailable Ollama gracefully.
- Adapter timeout is configurable.
- Integration test can be skipped when Ollama is not installed.

## Design Notes

- Commands: local provider parse request.
- Queries: provider health/status.
- API: `GET /api/v1/ai/providers/status` later exposes status.
- Tables: none.
- Domain rules: adapter output is untrusted until validated.
- UI surfaces: provider unavailable state later.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Request building and error normalization tests. |
| Integration | Optional/skippable Ollama integration test. |
| E2E | Not required. |
| Platform | Local Ollama presence is optional. |
| Release | Timeout/unavailable behavior covered. |

## Harness Delta

TBD.

## Evidence

TBD.

