# TASK-UX-003B - Professional Product UI Redesign Implementation

Status: implemented pending review after visual fidelity correction pass

## Scope

Implemented the approved Revision 2 Pocket Ledger visual direction in the
production Next.js frontend. The task changed presentation, layout, copy,
shared UI primitives, tests, E2E selectors, and visual QA evidence. During the
real-Ollama smoke, the rejected TASK-AI-001 aggregate spending prompt was found
to stop at frontend auto-routing, so the existing supported total-spending
route signals were corrected narrowly.

No backend behavior, database model, migration, API contract, authentication,
cloud provider, or new financial product feature was added.

## Component Architecture

- `AppShell` owns the compact desktop sidebar, mobile bottom navigation, brand
  lockup, page heading, skip link, and main landmark.
- Shared primitives in `ui.tsx` own button sizing, variants, form controls,
  surface defaults, focus treatment, and disabled states.
- Dashboard uses `DashboardSummary`, compact `BudgetProgress`,
  `DashboardCategoryBreakdown`, and `RecentTransactions` as overview sections
  instead of a long feature page.
- Transactions uses one compact toolbar for month/filter/export controls,
  `RecentTransactions`, menu-based `TransactionRow`, and the existing delete
  confirmation dialog.
- Budgets keeps `BudgetSetupForm` and `BudgetProgress`, with a monthly summary
  and category ledger/list.
- Assistant uses `AssistantWorkspace`, `ChatToLedger`, `AiDraftReview`, and
  `InsightResult`. The request-type selector is no longer visible in the
  primary UI; routing remains automatic.
- Settings uses open sections for local Ollama guidance, local data warnings,
  and `ClearAiHistory`.

## Implemented Design Tokens

- Background: `ledger.wash` (`#f7faf7`)
- Surface: `ledger.panel` (`#ffffff`)
- Text: `ledger.ink` (`#111815`)
- Muted text: `ledger.muted` (`#66736b`)
- Border: `ledger.line` (`#dfe8e1`)
- Accent: `ledger.accent` (`#24764a`)
- Strong accent: `ledger.accent-strong` (`#185a37`)
- Soft accent: `ledger.accent-soft` (`#e7f3ec`)
- Shadows: restrained `soft` and dialog elevation
- Buttons: `small`, `default`, `large`, `icon`; `primary`, `secondary`,
  `outline`, `ghost`, `danger`

## Route Implementation

- `/dashboard`: one dominant current-balance composition, subordinate monthly
  income/expense, compact monthly budget status, category spending list, and
  recent transaction preview. The large quick-action card and 2x2 equal-card
  grid were removed.
- `/transactions`: month, refresh, filters, and export live in one compact
  toolbar. Rows use a ledger/list structure and row overflow menu for delete.
  Permanent red row delete buttons were removed.
- `/budgets`: selected month, budget setup/edit form, one monthly budget
  summary, progress display, and category budget list.
- `/assistant`: dedicated workspace with empty-state quick actions only,
  automatic routing, receipt-style draft review, structured insight results,
  clarification, unavailable/error, and composer behavior.
- `/settings`: local Ollama guidance, local data warning, troubleshooting link,
  and AI-history privacy action.

## Intentional Deviations

- The approved draft concept includes `Sửa` where a safe edit action exists.
  No safe draft edit flow exists in the product today, so no inert `Sửa` button
  was added.
- Concept assets contain illustrative icons. The implementation uses the
  existing inline SVG icon system consistently to avoid adding a new icon
  dependency.
- Browser evidence was captured with Playwright Chromium because Browser/IAB
  was unavailable in this environment. The visual capture spec waits for loaded
  text and relevant data before taking screenshots.

## Visual QA Evidence

Evidence directory:

`docs/design/implementation-evidence/TASK-UX-003B/`

Screenshots captured:

- `screenshots/assistant-empty-desktop.png`
- `screenshots/assistant-draft-desktop.png`
- `screenshots/assistant-draft-mobile.png`
- `screenshots/assistant-total-result-desktop.png`
- `screenshots/assistant-clarification-desktop.png`
- `screenshots/assistant-provider-unavailable-desktop.png`
- `screenshots/dashboard-desktop.png`
- `screenshots/transactions-populated-desktop.png`
- `screenshots/transactions-empty-desktop.png`
- `screenshots/transactions-populated-mobile.png`
- `screenshots/transactions-delete-sheet-mobile.png`
- `screenshots/budgets-desktop.png`
- `screenshots/settings-desktop.png`
- `screenshots/app-shell-desktop.png`
- `screenshots/app-shell-mobile.png`
- `screenshots/shared-loading-error-dialog.png`
- `screenshots/real-ollama-total-smoke.png`
- `screenshots/real-ollama-draft-smoke.png`
- `screenshots/real-ollama-draft-mobile-smoke.png`

Visual capture command:

```bash
docker compose -p pocket-ledger-e2e -f compose.yaml -f compose.e2e.yaml run \
  e2e npx playwright test --config=playwright.visual.config.ts
```

The command was run against the isolated E2E project and isolated SQLite
volume, then the generated PNG files were copied into the evidence directory.

## Validation

- Frontend: `npm ci`; `npm test` (`11 files`, `66 tests`); `npm run lint`;
  `npm run typecheck`; `npm run build`
- Backend: `pytest` (`295 passed`, `1 skipped`, `1 warning`);
  `ruff check .`; `black --check .`; `mypy app`
- Runtime: `docker compose config`; `docker compose up -d --build`;
  `docker compose ps`; `scripts/runtime-smoke.sh`
- E2E: `scripts/e2e-mvp.sh` passed (`1 passed`) with axe checks and responsive
  route checks.
- Visual evidence: `playwright.visual.config.ts` capture passed (`1 passed`)
  and produced all 16 required screenshots.
- Real Ollama smoke: local ignored `.env` used `qwen3:4b-instruct` with
  `POCKET_LEDGER_OLLAMA_TIMEOUT_SECONDS=240`. Through `/assistant`, the
  aggregate total-spending prompt called `/api/ai/query-spending` and returned
  200 in about 20.7 seconds; the colloquial transaction prompt called
  `/api/ai/parse` and returned 200 in about 16.6 seconds. Backend logs showed
  outbound `POST .../api/chat` with `HTTP/1.1 200 OK`. Ledger snapshots before,
  after query, and after draft cancellation were unchanged.

## Remaining Limitations

- General economic conversation remains out of scope.
- Persistent chat history remains out of scope.
- Draft editing remains out of scope until a safe edit flow is implemented.
- Real Ollama speed is local-machine dependent. This validation needed a
  240-second local timeout for the cold path, while warmed successful calls
  completed in under 20 seconds. The deterministic E2E provider and
  Ollama-disabled runtime paths remain covered.
