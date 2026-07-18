# Pocket Ledger AI Frontend

Next.js frontend shell for Pocket Ledger AI.

## Scope

The frontend currently provides:

- App Router layout.
- Dashboard route.
- Live dashboard summary cards backed by the dashboard summary proxy.
- Live monthly budget remaining status backed by the budget remaining proxy.
- Budget setup/edit form backed by the monthly budget setup proxy.
- Selected-month control and explicit dashboard refresh.
- Chat-to-Ledger UI that sends messages to the AI parse proxy, reviews drafts,
  confirms through the AI confirmation proxy, and refreshes recent transactions,
  dashboard summary, and budget remaining data.
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
`/api/ai/query-budget-remaining`, and `/api/ai/query-spending-breakdown`.

The dashboard renders without a running backend. Recent transactions and
Chat-to-Ledger actions show safe error states until the backend is available.
Live financial responses are fetched without static caching. With Ollama
disabled or unavailable, AI parse and insight requests show a provider
unavailable state instead of sample or fabricated financial answers.

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
