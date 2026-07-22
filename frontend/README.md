# Pocket Ledger AI Frontend

Next.js frontend shell for Pocket Ledger AI.

## Scope

The frontend currently provides:

- App Router layout with a multi-page app shell.
- User-facing routes for `/dashboard`, `/transactions`, `/budgets`,
  `/assistant`, and `/settings`.
- Professional product UI treatment based on the approved Revision 2 design
  system: compact sidebar, mobile bottom navigation, ledger-style transaction
  rows, balance-led dashboard, and receipt-style AI draft review.
- Live dashboard summary cards backed by the dashboard summary proxy.
- Live monthly budget remaining status backed by the budget remaining proxy.
- Dashboard overview with compact summary, budget preview, recent transaction
  preview, and quick navigation actions.
- Transactions page with transaction list, filters, soft delete, and CSV/JSON
  export.
- Budgets page with selected-month budget progress and setup/edit form backed by
  the monthly budget setup proxy.
- Dedicated assistant page that sends messages to the AI parse proxy, reviews
  drafts, confirms through the AI confirmation proxy, and renders structured
  spending insights.
- Settings page with local Ollama guidance and the AI history privacy action.
- Insight chat actions for spending this month, remaining food budget, and top
  spending this week. These call same-origin proxies for the existing backend
  insight endpoints and render only structured backend response fields.
- Recent transactions UI backed by the existing backend list endpoint.
- Shared VND money formatting helper.
- Typed access to safe frontend API clients and runtime configuration.

The chat UI only mutates the ledger through the existing backend AI confirmation
endpoint. It does not call the manual transaction creation endpoint directly.

## Configuration

Create `.env.local` if you need to override the backend URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8010
```

For Docker Compose, server-side route handlers use `BACKEND_INTERNAL_URL` to
reach the backend over the Compose network:

```bash
BACKEND_INTERNAL_URL=http://backend:8010
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8010
```

Browser-facing requests continue to call same-origin frontend routes such as
`/api/transactions`, `/api/dashboard/summary`,
`/api/budgets/monthly/{year}/{month}`,
`/api/budgets/monthly/{year}/{month}/remaining`, `/api/ai/parse`,
`/api/ai/confirm`, `/api/ai/query-spending`,
`/api/ai/query-budget-remaining`, `/api/ai/query-spending-breakdown`,
`/api/transactions/export`, `/api/transactions/{transactionId}`, and
`/api/ai/history`.

The dashboard renders without a running backend. Recent transactions and
Chat-to-Ledger actions show safe error states until the backend is available.
Live financial responses are fetched without static caching. With Ollama
disabled or unavailable, AI parse and insight requests show a provider
unavailable state instead of sample or fabricated financial answers.

The tracked default model name is `qwen3:4b-instruct`, while the repository
default keeps `POCKET_LEDGER_OLLAMA_ENABLED=false`. To use a host Ollama runtime,
pull the model manually and enable it in the ignored local `.env` file:

```bash
ollama pull qwen3:4b-instruct
ollama list
```

```bash
POCKET_LEDGER_OLLAMA_ENABLED=true
POCKET_LEDGER_OLLAMA_BASE_URL=http://host.docker.internal:11434
POCKET_LEDGER_OLLAMA_MODEL=qwen3:4b-instruct
```

No model is downloaded by Docker build, Compose startup, tests, E2E, or release
validation.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Open `http://127.0.0.1:3000`.

Docker Compose starts the production Next.js server on port `3000`:

```bash
docker compose up --build frontend
```

## Validate

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Vitest and React Testing Library cover the live dashboard data path, budget
setup form validation, and same-origin proxy behavior. Production proof remains
lint, typecheck, and build.

## End-To-End Demo

The primary E2E command runs from the repository root:

```bash
scripts/e2e-mvp.sh
```

It starts an isolated Compose stack, seeds a clean E2E SQLite database, and runs
Playwright Chromium against the full frontend/backend flow. The scenario also
runs axe accessibility smoke checks and fails on critical or serious
violations. It does not require real Ollama. Generated Playwright reports,
traces, screenshots, videos, and download artifacts are ignored under
`playwright-report/`, `test-results/`, and `e2e-artifacts/`.

For an already-running compatible app, the frontend-local command is:

```bash
npm run e2e
```

The root release command also runs the frontend gates:

```bash
scripts/release-validate.sh
```
