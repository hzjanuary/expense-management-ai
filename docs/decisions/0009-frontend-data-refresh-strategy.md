# 0009 Frontend Data Refresh Strategy

Date: 2026-07-17

## Status

Proposed

## Context

The frontend already has Recent Transactions and Chat-to-Ledger behavior. I01
will add live dashboard totals, budget progress, insight chat, export, soft
delete, and clear AI history UI. These surfaces must refresh consistently after
AI confirmation and soft deletion without the frontend computing authoritative
financial totals.

## Decision

Propose a shared frontend data-fetching and refresh strategy for release
readiness. The implementation should use one consistent cache/revalidation
pattern for:

- recent transactions,
- dashboard summary,
- budget remaining,
- budget setup,
- insight answers where refresh is meaningful,
- post-confirm and post-delete invalidation.

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

Tradeoffs:

- Adds frontend architecture constraints before implementation.
- A data-fetching library may add dependency surface if one is not already
  installed.
- The final choice should be justified by US-702 or US-703 implementation.

## Follow-Up

- US-702 should choose the concrete strategy and update this decision to
  Accepted or Superseded.
- US-706 should verify post-confirm and post-delete refresh behavior.

