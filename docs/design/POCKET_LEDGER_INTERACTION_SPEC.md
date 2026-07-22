# Pocket Ledger Interaction Spec

Status: revised draft for TASK-UX-003A approval. This is not production
behavior yet.

## Principles

- Financial data is primary; AI is assistive.
- Every financial mutation remains explicit and deterministic.
- Navigation should be obvious for low-tech users.
- Avoid hidden technical modes in primary UI.
- Use subtle motion only to clarify state.

## Navigation

### Desktop Sidebar

- Persistent left sidebar on desktop and small laptop widths.
- Width target: `232px`.
- Links:
  - `Tổng quan`
  - `Giao dịch`
  - `Ngân sách`
  - `Trợ lý`
  - `Cài đặt`
- Each item is a semantic link.
- Current item uses `aria-current="page"` plus a visible accent rail and soft
  background.
- Keyboard focus uses a visible green outline independent of active state.
- Sidebar copy may mention local-first status, but should not expose provider,
  runtime, API, or container wording.
- Selected navigation must always match the displayed page.

### Mobile Navigation

- Use bottom navigation for the same five destinations.
- Each item has icon + text label.
- Minimum target height: `44px`.
- Use `env(safe-area-inset-bottom)` padding.
- Content bottom padding must account for nav height.
- Active state cannot rely on color alone; use icon treatment, text weight, or
  a top indicator.

## Page Structure

- One clear `h1` per page.
- Page headers are compact.
- Avoid a repeated page-header card above every route.
- Main content should use open sections, dividers, tables, and focused panels.
- Avoid page-level giant wrappers and nested cards.

## Assistant Workspace

### General Layout

- `/assistant` is a dedicated financial workspace.
- Transcript is the main canvas.
- User messages are restrained and right-aligned or visually distinct.
- Assistant financial results are full-width panels, not cramped bubbles.
- Composer stays near the bottom and must not cover transcript content.
- Quick actions appear only in the empty state. Once a user message, draft,
  result, clarification, or error exists, quick actions are removed and content
  begins near the compact header.

### Composer

- Multiline input with visible or accessible label.
- `Enter` sends.
- `Shift+Enter` inserts a newline.
- Send button is disabled while submitting.
- Duplicate submissions are blocked.
- Input is preserved after errors.
- No full-page reload.
- On mobile, composer sits above bottom navigation with safe-area clearance.

### New Conversation

- `Cuộc trò chuyện mới` clears session-only UI messages and current draft/result
  state.
- It must not clear confirmed ledger records or stored AI history.
- It must not call backend delete endpoints.

### Draft Review

Flow:

```text
User message
  -> structured extraction
  -> draft review
  -> explicit confirmation
  -> deterministic backend mutation
```

Draft state shows:

- amount;
- type (`Chi` or `Thu`);
- description;
- Vietnamese category label;
- date;
- optional merchant when supported by current data;
- note that the transaction is not saved yet.

Actions:

- `Xác nhận`: primary, sends exactly one confirmation request.
- `Sửa`: opens the existing safe edit affordance when implemented. If editing
  is not available in TASK-UX-003B, hide it rather than showing an inert action.
- `Hủy`: clears the current draft UI state only.

### Insight Results

- Display backend-grounded fields only.
- Do not show raw slugs or internal field names.
- Total-spending result must not show a category field.
- Category-spending result uses Vietnamese category labels.
- Existing results become stale or are cleared when financial data changes.
- Do not automatically rerun provider-backed insights after refresh.

### Clarification And Errors

Clarifications are calm and actionable:

- `Bạn muốn ghi khoản này vào nhóm nào?`
- `Khoản này có số tiền bao nhiêu?`
- `Bạn muốn xem chi tiêu trong khoảng thời gian nào?`

Provider unavailable:

```text
Trợ lý chưa sẵn sàng. Hãy kiểm tra Ollama trong Cài đặt.
```

Never expose `intent`, `category_slug`, `date_range`, `provider`, `model`,
internal hostnames, stack traces, or raw provider output.

## Dashboard

Dashboard should answer:

- current balance;
- monthly income;
- monthly expense;
- monthly budget health;
- recent changes;
- spending categories.

Interactions:

- Month selector updates summary and budget values.
- Quiet inline actions may navigate to relevant existing pages.
- Dashboard must not contain full budget edit, export, delete confirmation, AI
  history clearing, or full assistant composer.
- Dashboard uses one primary balance composition. Monthly income and expense
  are subordinate values inside the same composition or adjacent secondary
  band, not equal metric cards.

## Transactions

- Filters do not export automatically.
- Exports start only after explicit user action.
- CSV/JSON export is one restrained `Xuất dữ liệu` control or compact menu.
- Row actions live in an overflow menu.
- Do not show a visible red delete button on every row.
- Delete opens explicit confirmation.
- No optimistic removal before backend success.
- On successful delete, refresh all backend-derived financial views.
- On `404` or `409`, show safe copy and refresh from backend.

Mobile:

- Use stacked ledger rows in one shared list surface.
- Avoid horizontal scrolling.
- Compact filter control opens a sheet or compact panel.
- Destructive confirmation uses a bottom sheet with a backdrop. The underlying
  app and bottom navigation are inert while the sheet is open.

## Budgets

- Selected month remains visible.
- Save validates locally before request.
- Save success refreshes budget progress.
- Failed save preserves entered values.
- Existing configured values prefill on selected-month change.
- Stale fetches must not overwrite current-month form state.
- Category removal is presented as removing a budget row, not deleting a
  financial transaction.
- Do not include unsupported tips, learning links, notes, or help modules.

## Settings

Sections:

- local AI guidance;
- privacy and local data;
- clear AI history;
- data reset warning;
- known limitations;
- app information where currently supported.

Clear AI history:

- Requires confirmation.
- States that confirmed transactions and balances remain.
- Shows success counts.
- Does not mutate dashboard financial state locally.

Data reset:

- App may explain Docker volume reset, but no in-app destructive reset action
  exists in the current product.

## Component States

### Hover

- Slight background shift or border accent.
- No scale bounce.

### Focus

- 2px visible outline in `focus.ring`.
- Offset at least 2px.
- Focus style must be visible on white and green backgrounds.

### Pressed

- Slightly darker surface or accent.
- No layout shift.

### Disabled

- Reduce opacity and block pointer.
- Disabled meaning must not rely only on color.

### Loading

- Keep dimensions stable.
- Use skeleton rows for lists/tables.
- Use `role="status"` for loading text.

## Motion

- Dialog open/close may fade and translate by 4px.
- Toast/status may fade in.
- Respect `prefers-reduced-motion`.
- No large page-transition animation.

## Accessibility

- WCAG AA contrast for text and controls.
- Semantic landmarks: navigation and main content.
- One `h1` per page.
- Labels for inputs, selects, textareas.
- Dialogs have accessible names and descriptions.
- Status and errors use live regions.
- Income/expense, over-budget, and destructive states include text labels.
- Touch targets are at least `44px` on mobile.
- Layout supports 200% zoom without horizontal overflow.
