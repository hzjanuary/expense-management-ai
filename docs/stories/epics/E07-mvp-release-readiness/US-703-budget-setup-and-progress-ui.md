# US-703 Budget Setup And Progress UI

## Status

planned

## Lane

high-risk

## Product Contract

Allow users to configure monthly total and category budgets, then display spent,
remaining, and over-budget state from existing budget APIs.

## Relevant Product Docs

- `docs/product/expense-ai/API_CONTRACT.md`
- `docs/product/expense-ai/DOMAIN_MODEL.md`
- `docs/product/expense-ai/UX_FLOWS.md`
- `docs/initiatives/I01-mvp-release-readiness/DEMO_SCRIPT.md`

## Dependencies

- US-401 Monthly Budget Setup.
- US-402 Category Remaining Budget.
- US-701 Full-Stack Local Runtime.
- US-702 Live Dashboard Data Integration.

## Acceptance Criteria

- User can create or update total monthly budget.
- User can configure expense-category budgets.
- UI displays configured budget, spent, remaining, and over-budget state.
- UI uses existing US-401 and US-402 APIs.
- Amount inputs preserve integer minor-unit behavior.
- Negative, float, unsupported category, duplicate category, and over-total
  invalid states get safe feedback.
- Successful update refreshes dashboard budget state.
- No AI budget mutation is added.

## Design Notes

- Commands: budget setup upsert through existing API.
- Queries: get budget setup and computed remaining values.
- API: `PUT /api/v1/budgets/monthly/{year}/{month}`, `GET /api/v1/budgets/monthly/{year}/{month}`, `GET /api/v1/budgets/monthly/{year}/{month}/remaining`.
- Tables: existing budget tables only.
- Domain rules: expense categories only; integer minor-unit amounts.
- UI surfaces: budget settings form, category budget list, progress/remaining state.

## Explicit Out Of Scope

- AI budget intent mutation.
- Budget alerts.
- New backend budget schema.
- Custom categories.
- Budget history analytics.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Component/form validation tests for budget amounts and category rows. |
| Integration | API calls persist and reload budget setup; invalid requests surface errors. |
| E2E | Demo sets total budget `5,000,000` and food budget `2,000,000`, then sees remaining update. |
| Platform | Responsive budget form smoke. |
| Release | Budget values remain consistent after transaction confirmation and deletion. |

## Harness Delta

Add frontend budget setup/progress proof to release matrix when implemented.

## Evidence

TBD.

