# 0009 Frontend Data Refresh Strategy

Date: 2026-07-17

## Status

Accepted

## Context

The frontend already has Recent Transactions and Chat-to-Ledger behavior. I01
will add live dashboard totals, budget progress, insight chat, export, soft
delete, and clear AI history UI. These surfaces must refresh consistently after
AI confirmation and soft deletion without the frontend computing authoritative
financial totals.

## Decision

Use a lightweight dashboard-owned refresh strategy for release readiness rather
than adding a data-fetching library.

US-702 implements:

- same-origin frontend API route handlers for live financial data,
- server-to-server backend calls through server-only `BACKEND_INTERNAL_URL`,
- `cache: "no-store"` and `Cache-Control: no-store` for financial responses,
- typed frontend API modules at the boundary,
- component-local fetch state with `AbortController` cancellation,
- monotonic request sequence checks so stale month responses cannot overwrite
  newer data,
- a dashboard-owned selected month and refresh revision,
- callback-based invalidation after AI confirmation.

The shared refresh revision is passed to:

- recent transactions,
- dashboard summary,
- budget remaining.

Future UI stories should reuse the same explicit invalidation boundary where it
fits, especially after soft deletion in US-705. Insight answers may fetch on
demand rather than subscribe to this dashboard refresh signal unless the UI
needs cross-panel invalidation.

The browser must treat backend API responses as authoritative and format
integer minor-unit values for display only.

## Alternatives Considered

1. SWR for shared client-side fetch, cache, and revalidation.
2. TanStack Query for shared query keys and invalidation.
3. Per-component `fetch` state with manual callbacks.
4. Server-only rendering for every dashboard value.

## Consequences

Positive:

- Reduces inconsistent refresh behavior across dashboard, budget, and history.
- Makes E2E assertions easier because one mutation can invalidate known views.
- Keeps financial calculations in the backend.
- Avoids adding SWR, TanStack Query, or another global state/cache dependency
  before the frontend needs it.
- Keeps Compose server-side proxy traffic on `BACKEND_INTERNAL_URL` without
  exposing container-only URLs to the browser.

Tradeoffs:

- Adds frontend architecture constraints before implementation.
- Manual fetch state requires disciplined stale-response and error handling in
  each live component.
- Cross-page invalidation is intentionally not solved yet because the MVP shell
  remains dashboard-centered.
- A data-fetching library can still be reconsidered if later UI stories create
  broader cache coordination needs.

## Follow-Up

- US-706 should verify post-confirm and post-delete refresh behavior.
- US-705 should reuse the dashboard refresh revision after soft deletion where
  the delete UI affects dashboard panels.
