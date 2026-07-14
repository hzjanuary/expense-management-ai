# US-301 LLM Provider Interface

## Status

implemented

## Lane

high-risk

## Product Contract

Define a provider interface that returns structured drafts and status without coupling provider behavior to ledger mutations.

## Relevant Product Docs

- `docs/product/expense-ai/LLM_CONTRACT.md`
- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/decisions/0002-llm-provider-abstraction.md`
- `docs/decisions/0003-ledger-mutation-safety.md`

## Acceptance Criteria

- Interface supports `parse_transaction_text`.
- Provider returns structured JSON only.
- Provider errors are normalized.
- Provider health status is available.
- Unit tests use fake provider.
- Provider output does not persist records.
- Provider output does not mutate transactions or account balances.
- No real model adapter or AI parse API is added.

## Design Notes

- Commands: parse text into draft.
- Queries: provider status.
- API: none in this story; provider status endpoint consumes this interface later.
- Tables: none; parse-attempt persistence is deferred to later stories.
- Domain rules: provider cannot mutate ledger.
- UI surfaces: provider status display later.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Fake provider tests for success/error/status. |
| Integration | Not required until adapter/API story. |
| E2E | Not required. |
| Platform | Not required. |
| Release | Provider contract type checks. |

## Harness Delta

US-301 adds the provider contract only:

- New `app.ai` package with typed request/result/status models.
- New `LlmProvider` protocol with `parse_transaction_text` and `get_status`.
- Supported intent enum: `create_transaction`, `query_spending`, `set_budget`, `unknown`.
- Normalized errors: base, unavailable, timeout, and invalid response.
- Deterministic fake provider for tests.
- No real provider dependency, API route, persistence table, or ledger mutation was added.

Out of scope remained deferred: Ollama, llama.cpp, cloud providers, AI parse API, AI confirm API, AI draft persistence, budgets, frontend, chat UI, export/delete, and spending insight intents.

## Evidence

Validation completed on 2026-07-14:

- `cd backend && .venv/bin/pytest` -> 101 passed.
- `cd backend && .venv/bin/ruff check .` -> passed.
- `cd backend && .venv/bin/black --check .` -> passed.
- `cd backend && .venv/bin/mypy app` -> passed.
- Alembic validation was not rerun because US-301 required no schema or migration changes.
