# I01 Dependency Map

## Story Dependency Graph

```text
US-701 Full-Stack Local Runtime
  -> enables US-702, US-703, US-704, US-705, US-706, US-707

US-702 Live Dashboard Data Integration
  -> depends on US-205 Dashboard Summary
  -> depends on US-402 Category Remaining Budget
  -> refresh target for US-704 and US-705

US-703 Budget Setup and Progress UI
  -> depends on US-401 Monthly Budget Setup
  -> depends on US-402 Category Remaining Budget
  -> feeds US-702 dashboard budget display
  -> feeds US-704 budget remaining insight context

US-704 Insight Chat UI
  -> depends on US-501 Query Spending Intent
  -> depends on US-502 Budget Remaining Intent
  -> depends on US-503 Spending Breakdown Intent
  -> depends on US-404 Chat-to-Ledger UI Flow

US-705 Data Management UI
  -> depends on US-601 Export Transactions
  -> depends on US-602 Soft Delete Transaction
  -> depends on US-603 Clear AI History
  -> triggers refresh for US-702, US-703, and US-704 views

US-706 End-to-End MVP Demo
  -> depends on US-701 through US-705
  -> proves the deterministic demo script

US-707 Release Hardening and Documentation
  -> depends on successful US-706 validation
  -> produces release validation report and troubleshooting docs
```

## Existing Behavior Dependencies

| Story | Existing Behavior Required |
| --- | --- |
| US-701 | Backend health, Alembic migrations, frontend shell, provider status behavior. |
| US-702 | `GET /api/v1/dashboard/summary`, `GET /api/v1/budgets/monthly/{year}/{month}/remaining`, existing refresh after AI confirmation. |
| US-703 | `PUT /api/v1/budgets/monthly/{year}/{month}`, `GET /api/v1/budgets/monthly/{year}/{month}`, remaining endpoint from US-402. |
| US-704 | AI parse/confirm UI remains intact; insight endpoints compute totals from DB. |
| US-705 | Export, soft delete, and clear AI history endpoints; recent transaction refresh. |
| US-706 | Full-stack runtime, UI surfaces, deterministic test data, fake provider path. |
| US-707 | Passing backend, frontend, E2E, migration, privacy, accessibility, and documentation gates. |

## Ordering Rationale

US-701 comes first because every later release story needs a reliable local
startup and configuration path. US-702 and US-703 then make the dashboard and
budget state live. US-704 and US-705 complete the remaining user-facing
surfaces. US-706 proves the full product journey, and US-707 closes release
documentation and hardening.

