# US-101 Backend Bootstrap

## Status

implemented

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

- `cd backend && python3 -m venv .venv && .venv/bin/python -m pip install -e ".[dev]"`: completed.
- `cd backend && .venv/bin/pytest`: 6 passed, 1 third-party deprecation warning from FastAPI/Starlette TestClient.
- `cd backend && .venv/bin/ruff check .`: passed.
- `cd backend && .venv/bin/black --check .`: passed.
- `cd backend && .venv/bin/mypy app`: passed.
- `cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010`: backend started locally.
- `curl -i http://127.0.0.1:8010/health`: returned HTTP 200 with body `{"status":"ok"}` and an `X-Request-ID` response header.
- `curl -i http://127.0.0.1:8010/ -H 'X-Request-ID: smoke-root'`: returned HTTP 200 with body `{"name":"Pocket Ledger AI","status":"ok"}` and preserved `X-Request-ID: smoke-root`.
