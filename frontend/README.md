# Pocket Ledger AI Frontend

Next.js frontend shell for Pocket Ledger AI.

## Scope

The frontend currently provides:

- App Router layout.
- Dashboard route.
- Static summary cards.
- Chat-to-Ledger UI that sends messages to the AI parse proxy, reviews drafts,
  confirms through the AI confirmation proxy, and refreshes recent transactions.
- Recent transactions UI backed by the existing backend list endpoint.
- Budget settings placeholder.
- Shared VND money formatting helper.
- Typed access to `NEXT_PUBLIC_API_BASE_URL`.

The chat UI only mutates the ledger through the existing backend AI confirmation
endpoint. It does not call the manual transaction creation endpoint directly.

## Configuration

Create `.env.local` if you need to override the backend URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8010
```

The dashboard renders without a running backend. Recent transactions and
Chat-to-Ledger actions show safe error states until the backend is available.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Open `http://127.0.0.1:3000`.

## Validate

```bash
npm run lint
npm run typecheck
npm run build
```

No frontend test runner is configured in US-102. Validation proof is lint,
typecheck, and production build.
