# Pocket Ledger AI Frontend

Next.js frontend shell for Pocket Ledger AI.

## Scope

US-102 provides a placeholder-only application shell:

- App Router layout.
- Dashboard route.
- Static summary cards.
- Chat entry placeholder.
- Transaction history placeholder.
- Budget settings placeholder.
- Shared VND money formatting helper.
- Typed access to `NEXT_PUBLIC_API_BASE_URL`.

The shell does not fetch backend data or submit mutations yet.

## Configuration

Create `.env.local` if you need to override the backend URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8010
```

The app renders without a running backend.

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
