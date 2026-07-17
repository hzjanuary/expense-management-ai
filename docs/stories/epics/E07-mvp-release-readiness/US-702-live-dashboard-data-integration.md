# US-702 Live Dashboard Data Integration

## Status

planned

## Lane

high-risk

## Product Contract

Replace static dashboard summary placeholders with live backend data for
balance, monthly income, monthly expense, selected month, and budget remaining.

## Relevant Product Docs

- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/initiatives/I01-mvp-release-readiness/DEMO_SCRIPT.md`

## Dependencies

- US-205 Dashboard Summary.
- US-402 Category Remaining Budget.
- US-403 Recent Transactions UI.
- US-701 Full-Stack Local Runtime.

## Acceptance Criteria

- Dashboard reads `GET /api/v1/dashboard/summary`.
- Dashboard shows account balance, monthly income, monthly expense, and selected month.
- Dashboard integrates category remaining budget data from US-402.
- Loading, empty, error, and refresh states are present.
- Dashboard refreshes after AI-confirmed transactions.
- Dashboard refreshes after soft deletion.
- Dashboard does not implement budget editing.
- Dashboard does not compute authoritative financial totals in the browser.

## Design Notes

- Commands: none.
- Queries: dashboard summary and budget remaining.
- API: `GET /api/v1/dashboard/summary`, `GET /api/v1/budgets/monthly/{year}/{month}/remaining`.
- Tables: none directly; backend remains source of truth.
- Domain rules: frontend displays integer minor-unit values after formatting.
- UI surfaces: dashboard summary cards, budget remaining panel, refresh affordance.
- Data fetching should follow the selected frontend refresh/cache strategy.

## Explicit Out Of Scope

- Budget editing.
- Manual transaction creation UI.
- AI insight chat UI.
- Export/delete controls.
- Backend dashboard behavior changes unless required by a documented gap.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Component/utility tests for loading, empty, error, and value formatting when frontend test runner exists. |
| Integration | Frontend fetches dashboard and budget remaining APIs with typed responses. |
| E2E | Demo balance, monthly expense, and food remaining update after confirmation and deletion. |
| Platform | Browser smoke on desktop and narrow viewport. |
| Release | Dashboard values match backend API values in release demo. |

## Harness Delta

Add dashboard data integration proof to the release readiness matrix when
implemented.

## Evidence

TBD.

