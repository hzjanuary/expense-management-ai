# Pocket Ledger Visual QA Checklist

Use this checklist during TASK-UX-003B implementation and any later UI review.

This file is part of the TASK-UX-003A review package and must be included with
the concept archive.

## Source Concepts

Validate against `docs/design/concepts/revision-003a/`.

Required source images:

- `assistant-empty-desktop.png`
- `assistant-draft-desktop.png`
- `assistant-draft-mobile.png`
- `assistant-total-result-desktop.png`
- `assistant-clarification-desktop.png`
- `assistant-provider-unavailable-desktop.png`
- `dashboard-desktop.png`
- `transactions-populated-desktop.png`
- `transactions-empty-desktop.png`
- `transactions-populated-mobile.png`
- `transactions-delete-sheet-mobile.png`
- `budgets-desktop.png`
- `settings-desktop.png`
- `app-shell-desktop.png`
- `app-shell-mobile.png`
- `shared-dialog-empty-loading-states.png`

## Immediate Fail Conditions

Fail the design or implementation review if any checked surface contains:

- contradictory populated and empty states;
- selected navigation that does not match the page;
- incorrect financial calculations;
- unsupported fields or features;
- visible red delete action on every transaction row;
- quick actions persisting during active assistant content;
- sparkle, robot, brain, or magic iconography;
- repeated equal-card dashboard metrics;
- nested card stacks;
- mobile overflow or fixed-bar overlap;
- provider-unavailable error mixed with successful live results unless the
  result is explicitly stale;
- account selection, payment method, overdue, waiting classification, total
  assets/debt, cloud sync, or other unsupported product states.

## Per-Image QA Fields

Record these fields for each final concept:

- hierarchy;
- container model;
- typography;
- spacing;
- action priority;
- icon consistency;
- data correctness;
- responsive behavior;
- unsupported-feature check;
- anti-AI-slop check.

## Product Fit

- [ ] The app feels like a personal-finance product, not a generic AI dashboard.
- [ ] Financial values are the strongest visual elements.
- [ ] AI is presented as assistive, not as the visual brand identity.
- [ ] No unsupported cloud, sync, bank account, authentication, reporting, or
      investment features appear.
- [ ] No general-purpose economics chat is implied.

## Anti-AI-Slop

- [ ] No nested cards inside cards.
- [ ] No repetitive bento grid.
- [ ] No giant rounded wrappers around every section.
- [ ] No decorative gradients, glows, glassmorphism, dotted grids, or bokeh.
- [ ] No sparkle, robot, brain, or AI-magic icons.
- [ ] No meaningless badges or unexplained status chips.
- [ ] No page uses equal cards for every piece of data when a row/list/table
      would scan better.

## Layout

- [ ] Desktop sidebar remains useful at `1280x800`.
- [ ] Main content is not wrapped in one giant card.
- [ ] Page headers are compact.
- [ ] Section spacing follows the design-system scale.
- [ ] Tables and lists align dates, descriptions, categories, type, and amount.
- [ ] Amounts use tabular numerals and right alignment where appropriate.
- [ ] Buttons in a group share height and baseline.
- [ ] Forms have visible labels and nearby validation messages.

## Mobile

- [ ] Bottom navigation does not cover content.
- [ ] Assistant composer does not overlap bottom navigation.
- [ ] Touch targets are at least about `44px`.
- [ ] No horizontal overflow.
- [ ] Mobile transactions use stacked ledger rows, not a squeezed desktop table.
- [ ] Dialogs and bottom sheets fit within the viewport.
- [ ] Long Vietnamese labels wrap without clipping.

## Assistant

- [ ] The visible request-type dropdown is removed from the primary assistant UI.
- [ ] Quick actions appear only in the empty state.
- [ ] Active assistant states do not show a large greeting.
- [ ] Transaction draft card emphasizes amount, description, category, date, and
      confirmation requirement.
- [ ] `Xác nhận` is primary; `Sửa` is secondary when safe; `Hủy` is quiet.
- [ ] Analytical results are financial output panels, not tiny chat bubbles.
- [ ] Clarifications are friendly and actionable.
- [ ] Provider unavailable state gives a next step without internal URLs.
- [ ] No internal fields appear: `intent`, `category_slug`, `amount_minor`,
      `transaction_type`, `occurred_at_iso`, `date_range`, `missing_fields`.

## Dashboard

- [ ] Uses one primary current-balance composition.
- [ ] Monthly income and expense are subordinate values, not equal top cards.
- [ ] Monthly budget status is visible and uses correct percentages.
- [ ] Spending by category and recent transactions use rows/dividers.
- [ ] Does not show full budget editing, export controls, delete controls, clear
      AI history, or full assistant composer.

## Transactions

- [ ] Desktop uses a ledger/table architecture.
- [ ] Populated and empty states are separate.
- [ ] Export is one restrained `Xuất dữ liệu` control or compact menu.
- [ ] Row delete is inside overflow before confirmation.
- [ ] Mobile uses compact ledger rows in one shared surface.
- [ ] Delete bottom sheet has a backdrop and makes the underlying app inert.

## Budgets

- [ ] Monthly budget status is visually primary.
- [ ] `28.000 / 5.000.000` is shown as about `0,56%`, not `0%`.
- [ ] Category budgets are shown in a structured list.
- [ ] Save is the dominant form action.
- [ ] Removing a category row is not confused with deleting a transaction.
- [ ] No unsupported tips, learning links, or education modules appear.

## Settings

- [ ] Local AI guidance is understandable.
- [ ] Model name is shown as documented guidance only.
- [ ] Clear AI history is separate from financial-data controls.
- [ ] Data reset warning is prominent and does not expose unsafe commands in the
      normal UI.
- [ ] No secret values or internal hostnames appear.

## Accessibility

- [ ] One `h1` per page.
- [ ] Navigation landmarks are present.
- [ ] Main content landmark is present.
- [ ] Active navigation item uses `aria-current`.
- [ ] Keyboard focus is visible.
- [ ] Dialogs have accessible names and descriptions.
- [ ] Inputs have labels.
- [ ] Loading uses status semantics.
- [ ] Errors use alert semantics.
- [ ] Income/expense and over-budget states are not color-only.
- [ ] Contrast meets WCAG AA.
- [ ] Layout works at 200% browser zoom.

## Copy

- [ ] Primary navigation labels are exactly: `Tổng quan`, `Giao dịch`,
      `Ngân sách`, `Trợ lý`, `Cài đặt`.
- [ ] Page title is `Trợ lý`, not `Trợ lý AI`.
- [ ] User-facing copy is Vietnamese.
- [ ] Technical wording is kept out of normal surfaces.
- [ ] Destructive actions explain what changes and what remains.
- [ ] Empty states provide one useful next action.

## Concept Fidelity

- [ ] Implementation was compared against the relevant concept image.
- [ ] Any accidental raster text/glyph artifact was resolved through this
      written spec without changing the approved layout/hierarchy.
- [ ] New production UI does not add unapproved visible copy or controls.
- [ ] No screenshots, traces, reports, or generated QA artifacts are committed
      unless intentionally part of design documentation.
