# US-102 Frontend Bootstrap

## Status

implemented

## Lane

normal

## Product Contract

Create the initial Next.js web shell with dashboard, chat input, transaction history, and budget settings placeholders.

## Relevant Product Docs

- `docs/product/expense-ai/PRODUCT_CONTRACT.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/decisions/0001-local-first-stack.md`

## Acceptance Criteria

- Next.js app starts locally.
- Dashboard route exists.
- Chat input placeholder exists.
- Transaction history placeholder exists.
- Budget settings placeholder exists.
- Frontend lint/typecheck/build passes.
- Frontend renders without backend connectivity.
- No real transaction, dashboard, budget, AI, chat, export, delete, or auth behavior is implemented.

## Design Notes

- Commands: none.
- Queries: none yet.
- API: health/provider calls may be stubbed later.
- Tables: none.
- Domain rules: no financial mutation in frontend.
- UI surfaces: dashboard shell, chat panel, history, budget settings.
- Package manager: npm.
- No frontend test runner is configured in US-102; proof is lint, typecheck, build, and local startup smoke.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not configured for US-102; no test runner added. |
| Integration | Not required for placeholder shell. |
| E2E | Local `/dashboard` smoke returned HTTP 200. |
| Platform | Local frontend startup passed. |
| Release | Lint/typecheck/build passed. |

## Harness Delta

- Added frontend npm proof commands: `lint`, `typecheck`, and `build`.
- Added root and frontend README command documentation.

## Evidence

- `cd frontend && npm install` - passed; generated `package-lock.json`.
- `cd frontend && npm run lint` - passed.
- `cd frontend && npm run typecheck` - passed.
- `cd frontend && npm run build` - passed.
- `cd frontend && npm run dev -- --hostname 127.0.0.1 --port 3000` - passed with local server ready.
- `curl -I http://127.0.0.1:3000/dashboard` - passed, returned `HTTP/1.1 200 OK`.
- `git diff --check` - passed.
