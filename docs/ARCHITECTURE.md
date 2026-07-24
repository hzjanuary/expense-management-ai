# Architecture

Pocket Ledger AI is a local-first, single-user personal finance application.
The implemented stack is:

```text
Browser
  -> Next.js frontend
  -> same-origin frontend proxy routes
  -> FastAPI backend
  -> SQLite

Optional:
  -> local Ollama provider
```

The product boundary is intentionally small. Financial data stays in local
SQLite storage by default, the Docker Compose runtime publishes services on
localhost, and Ollama is disabled unless explicitly enabled by local
configuration.

## Runtime Components

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS, Vitest, React
  Testing Library, and Playwright for browser-level validation.
- **Backend:** FastAPI, Pydantic v2, SQLAlchemy async, Alembic, and pytest.
- **Database:** SQLite through Alembic-managed schema migrations. Docker Compose
  stores the normal runtime database in a named volume.
- **AI provider boundary:** `app.ai` defines a typed provider interface.
  `OllamaLlmProvider` calls local Ollama when enabled; `FakeLlmProvider`
  provides deterministic test and isolated E2E behavior.
- **Harness:** Markdown contracts plus the Rust `scripts/bin/harness-cli`
  durable matrix track accepted behavior and proof.
- **Evaluation:** `app.evaluation` loads and validates offline benchmark
  datasets. It is independent from HTTP handlers, database sessions, and
  ledger mutation commands.

## Dependency Direction

The backend follows a domain/application/interface split:

```text
domain
  <- application
      <- API routes
          <- frontend proxy/browser surfaces
```

Rules:

- Domain modules define stable money, category, and time-range behavior.
- Application modules implement deterministic command/query use cases.
- API routes parse boundary input and call application use cases.
- The frontend talks to same-origin proxy routes and does not import backend
  internals.
- Evaluation modules must not import database models, session factories, or
  financial mutation services.

## Financial Mutation Safety

The LLM provider may classify user text or produce typed transaction draft
fields. It never writes to the ledger.

Allowed mutation flow:

```text
User text
  -> provider structured extraction
  -> deterministic backend validation/recovery
  -> persisted pending draft
  -> explicit user confirmation
  -> deterministic transaction command
  -> account balance update
  -> recomputed dashboard/budget/insight reads
```

Read-only insight flows use the same provider boundary for classification, then
compute totals from persisted non-deleted transactions and budget rows.

## Data And Time

- Money is stored as integer VND minor units.
- Transaction amounts are positive; transaction type determines balance effect.
- Soft delete sets `deleted_at` and reverses the stored balance effect
  atomically.
- Dashboard, transaction filters, exports, budgets, and AI insights use shared
  timezone-aware UTC half-open ranges from `app.domain.time_ranges`.
- The default product timezone is `Asia/Ho_Chi_Minh`.

## Local Networking

Docker Compose exposes the frontend and backend on `127.0.0.1` by default.
Frontend-to-backend calls inside Compose use the internal Docker network and
`BACKEND_INTERNAL_URL`; browser-facing frontend proxy routes do not expose
internal backend hostnames.

## Privacy Boundaries

- Confirmed ledger records remain local unless the user exports them.
- Clearing AI history deletes local AI draft/history rows and raw prompt text
  stored there, but it does not delete confirmed transactions or application
  logs.
- Runtime logs should avoid raw financial descriptions and provider payloads.
- The MVP has no authentication, cloud sync, telemetry service, or automatic
  backups.

## Evaluation Boundary

The thesis evaluation subsystem introduced after the MVP release is offline and
read-only. It defines:

- JSONL benchmark record contracts.
- Strict typed validation.
- Deterministic dataset checksums.
- Privacy guards for synthetic data.
- Architectural tests preventing imports from production mutation and database
  modules.

Sprint 1 intentionally does not compare models or execute benchmark inference.
Future benchmark runners must preserve the same no-ledger-mutation boundary.
