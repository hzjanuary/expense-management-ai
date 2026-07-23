# TASK-REV-001 Source Review Corrections

Status: implemented

Date: 2026-07-22

## Scope

This task fixes confirmed source-review defects without changing product
features or financial business behavior.

## Corrections

- Local runtime ports now publish to loopback only:
  `127.0.0.1:${BACKEND_PORT:-8010}:8010` and
  `127.0.0.1:${FRONTEND_PORT:-3000}:3000`.
- `scripts/runtime-smoke.sh` verifies backend and frontend published sockets are
  loopback-bound.
- Product month boundaries now use one backend utility:
  `month_range_utc(year, month, timezone)`.
- `POCKET_LEDGER_DEFAULT_TIMEZONE` defaults to `Asia/Ho_Chi_Minh`.
- Dashboard summary, transaction listing, transaction export, budget remaining,
  and AI current-month queries use the same timezone-derived UTC half-open
  boundaries.
- Assistant quick-action intent overrides are one-shot; later free-form
  messages return to automatic routing.
- Assistant submissions are blocked while one request is active to avoid stale
  pending entries.
- Recent transaction list loads now abort older requests and ignore stale
  responses.
- AI draft cancellation is explicit through `POST /api/v1/ai/cancel`.
- Frontend draft cancel calls the cancellation proxy and only removes the draft
  UI after backend success.
- Income categories are available through one frontend category catalogue and
  render Vietnamese labels.
- Transaction overflow menu, delete dialog, and mobile filter dialog have
  keyboard/focus behavior covered by tests.
- Insight date ranges show user-facing inclusive periods or month labels
  without displaying the exclusive end as included.
- Temporary review archive `frontend/pocket-ledger-ui-concepts-r2.tar.gz` was
  removed and disposable review archive patterns were added to `.gitignore`.

## Timezone Boundary Matrix

For July 2026 in `Asia/Ho_Chi_Minh`, the shared utility produces:

- start: `2026-06-30T17:00:00Z`
- end: `2026-07-31T17:00:00Z`
- range semantics: `[start, end)`

Regression coverage verifies:

- `2026-06-30T16:59:00Z` is excluded from July.
- `2026-06-30T17:00:00Z` is included in July.
- `2026-06-30T17:30:00Z` is included in July.
- `2026-07-31T16:59:00Z` is included in July.
- `2026-07-31T17:00:00Z` is excluded from July.
- December to January rollover.
- Invalid timezone rejection.
- Dashboard, transaction list, export, budget remaining, and AI query-spending
  use matching transaction sets.

## Draft Cancellation Contract

`POST /api/v1/ai/cancel` accepts:

```json
{
  "draft_id": "uuid"
}
```

Pending drafts transition to `cancelled`. Repeated cancellation of a cancelled
draft is idempotent success. Missing drafts return `404`; confirmed and expired
drafts return `422`. Cancellation never creates ledger transactions, changes
account balances, changes budgets, or calls an LLM provider.

## Validation Evidence

- Backend full gate:
  `303 passed`, `1 skipped`, `1 warning`; Ruff passed; Black check passed;
  mypy passed.
- Frontend full gate:
  `npm ci`; `76 passed`; ESLint passed; TypeScript passed; production build
  passed.
- Runtime smoke:
  passed. The normal Compose stack built, started, reported healthy services,
  proved frontend/backend loopback bindings, verified Alembic at `0004 (head)`,
  and proved SQLite persistence across backend/frontend restart.
- E2E:
  `scripts/e2e-mvp.sh` passed with `1 passed`. The isolated E2E stack used its
  separate volume and removed only that isolated volume during cleanup.
- Visual Playwright and axe:
  visual Playwright suite passed with `1 passed`; axe coverage remains included
  in the MVP E2E scenario.
- Local provider note:
  the current ignored `.env` enabled AI during runtime validation, so a parse
  smoke returned a draft. The draft was cancelled through `POST /api/ai/cancel`
  with `200 OK` and no ledger mutation.
- `git diff --check`:
  passed.

## Limitations

- Published ports are still reachable from local processes on the host. This is
  intentional for a local single-user development runtime.
- AI draft cancellation is exposed only for stored draft lifecycle cleanup; it
  is not transaction deletion or history clearing.
