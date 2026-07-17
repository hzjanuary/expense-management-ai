# Test Matrix

This file maps product behavior to proof.

No product behavior has been defined or implemented yet. Do not mark a row
implemented until tests or validation evidence exist.

## Status Values

| Status | Meaning |
| --- | --- |
| planned | Accepted as intended behavior, not implemented |
| in_progress | Actively being built |
| implemented | Implemented and proof exists |
| changed | Contract changed after earlier implementation |
| retired | No longer part of the product contract |

## Matrix

| Story | Contract | Unit | Integration | E2E | Platform | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| US-001 | Product contract docs exist and preserve accepted spec intent | no | no | no | yes | planned | none |
| US-002 | MVP story backlog exists with validation expectations | no | yes | no | yes | planned | none |
| US-003 | Architecture decisions are recorded from template | no | yes | no | yes | planned | none |
| US-101 | Backend health and typed settings foundation | yes | yes | no | yes | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; live `curl /health` smoke passed |
| US-102 | Frontend shell with dashboard/chat/history/budget placeholders | yes | no | yes | yes | implemented | `npm install`; `npm run lint`; `npm run typecheck`; `npm run build`; local `/dashboard` smoke returned `HTTP 200` |
| US-103 | Local SQLite database and migrations foundation | yes | yes | no | yes | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; Alembic current/upgrade/downgrade/upgrade on temp SQLite DB |
| US-201 | Money uses integer minor units and categories are seeded | yes | no | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-202 | Manual expense creation decreases account balance | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; Alembic upgrade/downgrade/upgrade on isolated SQLite DB |
| US-203 | Manual income creation increases account balance | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-204 | Transaction list supports filters and excludes soft deletes | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-205 | Dashboard totals are computed from transactions | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-301 | LLM provider interface returns structured drafts/status only | yes | no | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-302 | Ollama adapter supports local structured output and graceful failure | yes | yes | no | yes | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; real Ollama smoke skipped unless `POCKET_LEDGER_RUN_OLLAMA_INTEGRATION=1` |
| US-303 | AI parse returns a draft for Vietnamese shorthand without ledger mutation | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-304 | Confirmed AI draft creates exactly one transaction | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; Alembic current/upgrade/downgrade/upgrade on isolated SQLite DB |
| US-305 | Low-confidence AI output asks clarification and does not mutate ledger | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-401 | Monthly and category budgets are validated and persisted | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app`; Alembic current/upgrade/downgrade/upgrade on isolated SQLite DB |
| US-402 | Category remaining budget is computed from configured budgets and transactions | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-403 | Recent Transactions UI reads transaction list and supports refresh | yes | yes | yes | yes | implemented | `npm run lint`; `npm run typecheck`; `npm run build`; local `/dashboard` smoke returned `HTTP 200` |
| US-404 | Chat-to-ledger UI records canonical expense after confirmation | yes | yes | yes | yes | implemented | `npm run lint`; `npm run typecheck`; `npm run build`; local `/dashboard` smoke returned `HTTP 200` |
| US-501 | Spending questions answer from DB totals | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-502 | Budget remaining questions use configured budgets and no-fabrication rules | yes | yes | no | no | implemented | `pytest`; `ruff check .`; `black --check .`; `mypy app` |
| US-503 | Spending breakdown questions compute top category deterministically | yes | yes | yes | no | planned | none |
| US-601 | Export transactions as user-triggered CSV/JSON | yes | yes | yes | yes | planned | none |
| US-602 | Soft delete excludes transactions from lists and totals | yes | yes | yes | no | planned | none |
| US-603 | Clear AI history removes AI records without deleting transactions | yes | yes | yes | no | planned | none |

## Evidence Rules

- Unit proof covers pure domain and application rules.
- Integration proof covers backend enforcement, data integrity, provider
  behavior, jobs, or service contracts.
- E2E proof covers user-visible browser flows.
- Platform proof covers only shell, deployment, mobile, desktop, or runtime
  behavior that cannot be proven in lower layers.
- A story can be implemented without every proof column if the story packet
  explains why.
