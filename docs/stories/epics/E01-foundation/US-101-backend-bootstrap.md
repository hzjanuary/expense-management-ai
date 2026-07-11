# US-101 Backend Bootstrap

## Status

planned

## Lane

normal

## Product Contract

Create a FastAPI backend foundation with typed settings, health check, JSON logging, and request IDs.

## Relevant Product Docs

- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/decisions/0001-local-first-stack.md`

## Acceptance Criteria

- Backend starts locally.
- `GET /health` returns `{ "status": "ok" }`.
- Settings are typed and environment-driven.
- JSON logging includes request ID.
- Unit tests pass.
- Lint and formatting checks pass.

## Design Notes

- Commands: health endpoint only.
- Queries: none.
- API: `GET /health`.
- Tables: none.
- Domain rules: none beyond boundary parsing.
- UI surfaces: none.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Backend health/settings tests. |
| Integration | HTTP test for `GET /health`. |
| E2E | Not required. |
| Platform | Local backend startup. |
| Release | Lint/type/format checks once configured. |

## Harness Delta

Add proof commands when the backend toolchain exists.

## Evidence

TBD.

