# TASK-UX-004 - Black-Purple Dark Theme

Status: implemented pending review

Date: 2026-07-23

## Scope

This task adds a persisted appearance system to the existing Pocket Ledger
frontend without changing financial behavior, backend APIs, migrations, or
runtime configuration. The default remains system preference; the existing light
theme remains the restrained green product identity; the new dark theme uses a
black-purple personal-finance palette.

## Hallmark Audit - Before Implementation

Hallmark was used in audit mode only against the current implementation and
available browser evidence. Suggestions that would alter the approved app shell,
route structure, palette, typography hierarchy, or product content were
discarded.

Ranked findings:

- Blocking: production components used fixed light-only surfaces such as
  `bg-white`, amber/rose background utilities, fixed light borders, and black
  overlays instead of semantic tokens.
- Blocking: no pre-hydration theme application existed, so an explicit dark
  preference would risk an initial light render.
- Blocking: Settings had no user-facing appearance control.
- Major: status surfaces, overlays, skeletons, and code blocks were not covered
  by the semantic color system.
- Major: theme persistence, system preference changes, invalid stored values,
  and keyboard interaction were not covered by tests.
- Minor: focus and selected states needed one semantic focus/accent system that
  preserved green in light mode and purple in dark mode.

## Implementation

- Added `ThemeMode = "system" | "light" | "dark"` and theme helpers in
  `frontend/src/lib/theme.ts`.
- Added `ThemeProvider` and `useTheme` for persisted client-side state.
- Added a server-rendered initialization script in
  `frontend/src/components/theme-initialization-script.tsx` so `<html>` receives
  `data-theme`, `data-theme-mode`, and `color-scheme` before hydration.
- Wrapped the app in `ThemeProvider` from `frontend/src/app/layout.tsx`.
- Moved Tailwind ledger colors to CSS-variable-backed semantic tokens.
- Added dark theme CSS variables using the approved black-purple palette.
- Converted fixed light-only production utilities to semantic surfaces, borders,
  overlays, status colors, skeleton, focus, and code tokens.
- Added autofill styling so browser-filled inputs remain readable in both
  themes.
- Added a Settings section named `Giao diện` with an accessible radio group:
  `Theo hệ thống`, `Sáng`, and `Tím đen`.

## Theme Contract

- Local storage key: `pocket-ledger-theme`.
- Default preference: system.
- Explicit light and dark selections persist on this device.
- System mode removes the stored override and follows
  `prefers-color-scheme`.
- Invalid stored values fall back to system mode.
- The browser `color-scheme` follows the resolved theme.
- No backend request, database write, migration, or API change is involved.

## Dark Palette

The implemented dark palette follows the requested values with RGB CSS
variables for Tailwind opacity support:

- background: `#09080D`
- primary surface: `#111018`
- elevated surface: `#181522`
- subtle surface: `#211A2F`
- primary text: `#F5F2FA`
- secondary text: `#B7AFC3`
- muted text: `#8E869B`
- border: `#332B40`
- accent: `#A855F7`
- accent hover: `#9333EA`
- accent soft: `#2B1B3D`
- focus ring: `#C084FC`
- success: `#34D399`
- warning: `#FBBF24`
- danger: `#FB7185`

## Visual Coverage

The visual Playwright suite now captures light and dark screenshots for:

- `/dashboard`
- `/transactions`
- `/budgets`
- `/assistant`
- `/settings`

Viewports:

- `1440x900`
- `390x844`

Additional dark state captures:

- transaction draft
- monthly spending-breakdown insight
- clarification
- provider unavailable
- transaction delete dialog
- mobile filter sheet

## Hallmark Audit - After Implementation

Hallmark audit mode was run again against the final browser screenshots. No
blocking dark-theme findings remain. A final audit pass for the correctness
update checked that the VND format, assistant follow-up routing, and dark/light
visual evidence did not introduce token drift, unsupported content, visible
internal fields, or AI-slop visual patterns.

- BLOCKING: none.
- NON-BLOCKING: the generated visual evidence remains in ignored output
  directories and is not committed as a durable release artifact.
- INTENTIONAL DEVIATION: existing assistant conversation composition and draft
  messaging remain unchanged from the approved post-redesign implementation;
  this task did not redesign IA, component anatomy, or assistant behavior.

Representative screenshots were inspected directly for dashboard, assistant
draft, transaction mobile list, settings, delete dialog, and filter sheet.
Dark-mode surfaces, overlays, selected navigation, Settings appearance control,
focus/accent color, and destructive states matched the semantic token system.
The final localization pass directly inspected the dark and light dashboard and
monthly breakdown screenshots after recapture.

## Validation Evidence

- `npm ci`: passed. Existing npm audit findings remain reported by npm and were
  not changed by this UI-only task.
- `npm test`: `13 files`, `91 tests` passed, including VND display formatting,
  analytical follow-up routing, and monthly spending-breakdown routing coverage.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Backend regression: `313 passed`, `1 skipped`, `1 warning`; `ruff check .`,
  `black --check .`, and `mypy app` passed.
- `docker compose config`: passed and preserved loopback-bound published ports.
- `scripts/runtime-smoke.sh`: passed with backend/frontend health, transaction
  proxy, Alembic head, loopback binding checks, restart persistence, and no
  volume deletion.
- `scripts/e2e-mvp.sh`: passed with Playwright `1 passed`; the existing axe
  checks in the MVP flow reported no critical or serious violations.
- Targeted backend spending-breakdown/time/provider coverage:
  `tests/test_ai_spending_breakdown_api.py`, `tests/test_time_ranges.py`, and
  `tests/test_ollama_provider.py` passed (`47 passed`, `1 skipped`,
  `1 warning`).
- Visual Playwright suite:
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.visual.config.ts`
  passed with `2 passed`. Browser-level assertions now verify rendered page text
  contains `4.075.000 ₫`, does not expose legacy `đ`/`VND` money text, does not
  expose raw `2026-07` or `July 2026` in product copy, and does not use dotted
  decimal percentages.
- `git diff --check`: passed.
- `scripts/bin/harness-cli query matrix`: passed.
- `docker compose down`: stopped the normal stack without removing volumes.

Visual evidence generated under ignored local output:

- Existing TASK-UX-003B evidence screenshots: 16 product-state PNGs.
- TASK-UX-004 screenshots: light and dark captures for `/dashboard`,
  `/transactions`, `/budgets`, `/assistant`, and `/settings` at `1440x900` and
  `390x844`.
- Additional dark captures: transaction draft, monthly breakdown insight,
  clarification, provider unavailable, delete dialog, and mobile filter sheet.
- Additional light capture: monthly breakdown insight.

## Final Correctness Pass

- Standardized generated backend answer strings to use Vietnamese display money
  formatting with a normal space before the `₫` symbol, for example
  `4.073.000 ₫`.
- Added defensive frontend answer rendering so legacy provider/backend strings
  containing `đ`, `VND`, or missing spacing are normalized before display.
- Added dashboard, transaction row, AI draft, spending insight, budget insight,
  and backend answer-string regression coverage for the display format.
- Extended deterministic frontend routing for analytical follow-ups such as
  `cụ thể có món nào đắt nhất không?`, `khoản nào lớn nhất?`,
  `tôi chi nhiều nhất cho thứ gì?`, and
  `giao dịch nào tốn nhiều tiền nhất?`.
- Follow-up prompts route to the existing spending-breakdown endpoint and never
  create a transaction draft. The current backend answer remains honest at the
  supported category-breakdown level; no individual-transaction claim was added.
- Added multi-turn coverage proving total spending result followed by an
  analytical follow-up uses the correct endpoint, creates no draft, calls no
  confirmation/manual transaction endpoint, and leaves ledger mutation paths
  untouched.
- Extended spending breakdown from current-week only to current-week and
  current-month ranges. Monthly prompts such as
  `tháng này tôi chi tiêu ở mục nào là nhiều nhất vậy?` now return a
  deterministic monthly category breakdown instead of a date-range
  clarification.
- Kept the answer at category/group level by using copy such as
  `nhóm Ăn uống`; no individual most-expensive transaction behavior was added.
- Final browser-render localization correction:
  - frontend `formatVnd()` now owns canonical display signs and always emits
    actual U+20AB `₫` with a normal space;
  - frontend percentages use vi-VN comma decimals, for example `98,16%`;
  - product month copy uses `Tháng 7, 2026` rather than `July 2026` or
    descriptive raw `2026-07`;
  - the native month input keeps its browser behavior while displaying the
    localized month label to users.

## Non-Changes

- No backend financial behavior changed; backend answer copy now uses the
  canonical display money format.
- No backend route or schema changed. The existing spending-breakdown endpoint
  now supports `date_range_label = "this_month"` in addition to `this_week`.
- No database migration was created.
- No financial calculation changed.
- No authentication, cloud provider, new AI intent, or product feature was
  added.
