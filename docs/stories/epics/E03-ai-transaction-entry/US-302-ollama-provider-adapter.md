# US-302 Ollama Provider Adapter

## Status

implemented

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
- Adapter validates Ollama `message.content` into `TransactionParseResult`.
- Adapter maps disabled, unavailable, timeout, and invalid output failures to normalized errors.
- Adapter does not persist AI output or mutate ledger state.

## Design Notes

- Commands: local provider parse request.
- Queries: provider health/status.
- API: `GET /api/v1/ai/providers/status` later exposes status.
- Tables: none.
- Domain rules: adapter output is untrusted until validated.
- UI surfaces: provider unavailable state later.
- Real Ollama smoke test is opt-in with `POCKET_LEDGER_RUN_OLLAMA_INTEGRATION=1`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Request building and error normalization tests. |
| Integration | Optional/skippable Ollama integration test. |
| E2E | Not required. |
| Platform | Local Ollama presence is optional. |
| Release | Timeout/unavailable behavior covered. |

## Harness Delta

US-302 adds the first real local provider adapter behind the US-301 interface:

- New `OllamaLlmProvider` implements `parse_transaction_text` and `get_status`.
- Ollama settings are typed and environment-driven.
- Ollama is disabled by default.
- Parse requests use the Ollama chat endpoint with `stream=false`, `temperature=0`, and `TransactionParseResult.model_json_schema()` in the `format` field.
- Response content is validated into `TransactionParseResult`.
- Disabled, connection, timeout, non-2xx, missing content, invalid JSON, and schema-invalid JSON behaviors are normalized.
- Tests use mocked `httpx` transport and do not require local Ollama.
- Optional real Ollama smoke test is skipped by default.

Out of scope remained deferred: AI parse API, AI confirm API, AI draft persistence, AI parse attempt table, transaction creation from AI output, frontend, chat UI, budgets, dashboard changes, export/delete, spending insights, and cloud adapters.

## Evidence

Validation completed on 2026-07-15:

- `cd backend && .venv/bin/pytest` -> 113 passed, 1 skipped.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- Alembic validation was not rerun because US-302 required no schema or migration changes.
