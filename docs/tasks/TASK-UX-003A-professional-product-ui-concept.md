# TASK-UX-003A Professional Product UI Concept

Status: revised design concept ready for review

## Scope

Create a professional redesign concept and design system for Pocket Ledger
before changing the production frontend.

This task is design-only. It does not change production React components,
routes, API contracts, backend behavior, database models, migrations, or
financial business rules. TASK-UX-003B must not start until this concept is
approved.

## Current UI Audit

Current-state screenshots were captured from the running Compose stack and
stored in `docs/design/concepts/current-audit/`.

Viewports inspected:

- `1440x900`
- `1280x800`
- `768x1024`
- `390x844`
- `375x812`

Routes inspected:

- `/dashboard`
- `/transactions`
- `/budgets`
- `/assistant`
- `/settings`

### Observed Problems

- The app relies on a repeated framed page-header card on every route.
- Many sections use the same bordered-card treatment, which makes hierarchy
  feel repetitive.
- The assistant page still reads like a form panel: quick actions, textarea,
  button, and request-type dropdown compete with the conversation.
- The visible `Loại yêu cầu` selector makes internal routing feel technical.
- The assistant transcript is not visually dominant enough for a dedicated
  workspace.
- Current dashboard hierarchy is functional but not product-like; it lacks a
  strong financial summary rhythm.
- Transactions are readable but need a more ledger-like information
  architecture.
- Mobile navigation works, but route content needs clearer bottom spacing and
  stronger mobile-specific row treatments.
- Copy is mostly Vietnamese but still has too much product/implementation
  framing around local AI.
- Visual identity is too generic: green + cards + panels, without a disciplined
  finance-product system.

## Design Direction

Pocket Ledger should feel calm, trustworthy, precise, mature, accessible,
private, and locally owned.

The approved direction is a restrained personal-finance product:

- neutral light app background;
- white primary surfaces;
- high-legibility dark text;
- restrained green accent;
- semantic color used only for status;
- subtle borders;
- minimal shadow;
- compact but comfortable density;
- strong monetary typography;
- ledger tables and rows over transaction cards;
- open layouts over nested cards.

AI should not dominate the visual identity. The assistant is a financial
workspace that produces draft receipts and structured financial answers.

## Source Of Truth

The authoritative revision concepts are in:

```text
docs/design/concepts/revision-003a/
```

The earlier `docs/design/concepts/final/` set was rejected and is not a source
of truth. TASK-UX-003B should implement the `revision-003a` container model,
hierarchy, spacing, component anatomy, action priority, navigation, and state
behavior. Written specifications clarify exact tokens and reject accidental
raster text/glyph drift; they do not permit major redesign during
implementation.

## Resolved Decisions

- Draft review shows `Sửa` only when a safe edit affordance exists. If that
  affordance is not implemented, hide `Sửa`; do not show an inert action.
- Dashboard uses one primary balance composition, not three equal metric cards.
- Mobile transaction deletion is accessed from a row overflow menu, not a
  visible red delete button on every row.
- Primary navigation and page title use `Trợ lý`, not `Trợ lý AI`.
- Assistant quick actions appear in the empty state only. After any user
  message, draft, result, clarification, or error appears, quick actions
  disappear and transcript content begins near the compact page header.

## Revision Concept Inventory

| File | Route/state | Viewport | Purpose |
| --- | --- | --- | --- |
| `docs/design/concepts/revision-003a/assistant-empty-desktop.png` | `/assistant`, empty | 1440x900 | Empty transcript, quick actions only in empty state, anchored composer |
| `docs/design/concepts/revision-003a/assistant-draft-desktop.png` | `/assistant`, draft | 1440x900 | Active transaction draft as compact receipt/review surface |
| `docs/design/concepts/revision-003a/assistant-draft-mobile.png` | `/assistant`, draft | 390x844 | Mobile receipt review, dominant confirm action, composer/nav clearance |
| `docs/design/concepts/revision-003a/assistant-total-result-desktop.png` | `/assistant`, total result | 1440x900 | Total spending result with amount and period, no category field |
| `docs/design/concepts/revision-003a/assistant-clarification-desktop.png` | `/assistant`, clarification | 1440x900 | Compact friendly clarification with no internal field names |
| `docs/design/concepts/revision-003a/assistant-provider-unavailable-desktop.png` | `/assistant`, unavailable | 1440x900 | Standalone local assistant unavailable state with next actions |
| `docs/design/concepts/revision-003a/dashboard-desktop.png` | `/dashboard` | 1440x900 | Primary balance composition, budget status, category spending, recent rows |
| `docs/design/concepts/revision-003a/transactions-populated-desktop.png` | `/transactions`, populated | 1440x900 | Desktop ledger table, filters, compact export, row overflow menu |
| `docs/design/concepts/revision-003a/transactions-empty-desktop.png` | `/transactions`, empty/no results | 1440x900 | Empty result state without transaction rows |
| `docs/design/concepts/revision-003a/transactions-populated-mobile.png` | `/transactions`, populated | 390x844 | Mobile ledger list with dividers, filter/export controls, row overflow |
| `docs/design/concepts/revision-003a/transactions-delete-sheet-mobile.png` | `/transactions`, delete sheet | 390x844 | Inert backdrop and explicit destructive bottom sheet |
| `docs/design/concepts/revision-003a/budgets-desktop.png` | `/budgets` | 1440x900 | Monthly summary, setup/edit section, category ledger |
| `docs/design/concepts/revision-003a/settings-desktop.png` | `/settings` | 1440x900 | Local assistant guidance, privacy, local data warning, limitations |
| `docs/design/concepts/revision-003a/app-shell-desktop.png` | Shared shell | 1440x900 | Reusable desktop sidebar, selected nav, open dashboard anatomy |
| `docs/design/concepts/revision-003a/app-shell-mobile.png` | Shared shell | 390x844 | Mobile top brand, bottom navigation, content clearance |
| `docs/design/concepts/revision-003a/shared-dialog-empty-loading-states.png` | Shared states | 1440x900 | Dialog, empty, loading, and error/unavailable component states |

## Concept Review

### Assistant Empty

- **Design intent:** Keep the first assistant visit simple and welcoming
  without making AI the visual brand.
- **Key layout decisions:** Centered empty-state prompt, four concise quick
  actions, anchored composer.
- **Deviation from current UI:** Removes the visible request-type dropdown from
  the primary assistant surface.

### Assistant Draft

- **Design intent:** Make a draft feel like a financial receipt requiring
  review, not an admin form.
- **Key layout decisions:** Amount is the strongest value, description follows,
  type/category/date/source are secondary rows, and the save guarantee is
  explicit.
- **Action priority:** `Xác nhận` is primary; `Sửa` is secondary if safe edit
  exists; `Hủy` is quiet.
- **Mobile implication:** Actions stack by priority rather than three equal
  bordered buttons.

### Assistant Result, Clarification, Unavailable

- **Design intent:** Separate successful financial output, clarification, and
  provider-unavailable states.
- **Key layout decisions:** No large greeting after conversation begins; no
  persistent quick-action row; no repeated assistant-avatar timeline.
- **State rule:** Do not show provider unavailable together with live results
  unless previous results are explicitly marked stale.

### Dashboard

- **Design intent:** Answer at a glance: current balance, month income/expense,
  budget health, category spending, and recent change.
- **Key layout decisions:** One dominant balance composition; budget is a
  secondary status band; category spending and recent transactions use open
  sections and row dividers.
- **Deviation from current UI:** Removes the large quick-action card and avoids
  equal metric cards.

### Transactions

- **Design intent:** Make transactions feel like a ledger.
- **Desktop decisions:** Filters are compact, export is one restrained control,
  row amounts are tabular and right-aligned, row actions live in overflow.
- **Mobile decisions:** Rows form one shared ledger list with dividers; filter
  opens a compact control/sheet; export is secondary; delete is in row overflow.
- **Empty-state rule:** Never show rows and an empty state simultaneously.

### Budgets

- **Design intent:** Make monthly budget health primary and category budgets
  comparable.
- **Key layout decisions:** One monthly summary, one setup/edit section, one
  category ledger/list.
- **Data correctness:** `28.000 / 5.000.000 = 0,56%`; category rows sum to the
  displayed total spent.
- **Unsupported-feature boundary:** No sidebar tips, no `Tìm hiểu thêm`, and no
  invented education/help features.

### Settings

- **Design intent:** Explain local assistant, privacy, and local data without
  exposing secrets or unnecessary networking detail.
- **Key layout decisions:** Open sections with dividers; clear AI history is
  separated from financial data warnings.
- **Icon rule:** Local assistant uses a neutral chat icon, not a robot, brain,
  sparkle, or magic symbol.

### Shared Shell

- **Design intent:** Define reusable desktop/sidebar and mobile/bottom-nav
  anatomy from supported product surfaces only.
- **Key layout decisions:** Narrow sidebar, compact identity, selected nav rail,
  open main content, mobile safe-area clearance.
- **Unsupported-feature boundary:** No account selection, payment method,
  overdue state, waiting classification, total assets/debt, or cloud status.

### Shared States

- **Design intent:** Normalize destructive confirmation, empty, loading, and
  safe error states.
- **Key layout decisions:** Destructive dialogs state consequence and use red
  only for final confirmation; loading skeletons preserve layout; errors have a
  clear retry.

## Visual QA Record

Every image in `revision-003a` was inspected directly after copying into the
repository.

| Concept | QA result |
| --- | --- |
| Assistant empty desktop | Pass: quick actions only in empty state; selected nav matches; no sparkle/robot/brain; no unsupported finance fields. |
| Assistant draft desktop | Pass: active state has no greeting/quick actions; receipt hierarchy and action priority are clear; no account/profile footer. |
| Assistant draft mobile | Pass: amount-first receipt; confirm dominant; edit/cancel quiet; composer and bottom nav do not overlap. |
| Assistant total result desktop | Pass: total result emphasizes amount/period/count; no category field; no provider-unavailable mixed state. |
| Assistant clarification desktop | Pass: compact actionable clarification; no internal fields; no account/profile footer. |
| Assistant provider unavailable desktop | Pass: standalone safe error with settings/retry next steps; no successful result mixed in. |
| Dashboard desktop | Pass: one primary balance composition; budget percentage is correct; no large quick-action card. |
| Transactions populated desktop | Pass: populated rows only; export is compact; row delete is inside overflow, not permanently visible on each row. |
| Transactions empty desktop | Pass: empty/no-results state only; no transaction rows appear at the same time. |
| Transactions populated mobile | Pass: ledger-list treatment with dividers; row overflow actions; no visible red delete button on rows. |
| Transactions delete sheet mobile | Pass: backdrop makes app inert; consequence copy is clear; nav labels remain supported. |
| Budgets desktop | Pass: no tip/help card; supported inputs only; category values sum to total spent. |
| Settings desktop | Pass: open sections; safe local assistant guidance; no robot/brain/sparkle iconography. |
| App shell desktop | Pass: supported dashboard data only; selected nav matches page; no OS chrome or unsupported fields. |
| App shell mobile | Pass: supported nav labels; no unsupported top-bar action; bottom nav clearance visible. |
| Shared dialog/empty/loading states | Pass: Vietnamese-only product copy; no contradictory states; destructive copy avoids permanent-erasure claim. |

## Current Assistant Versus Proposed Assistant

| Area | Current screenshot | Proposed concept |
| --- | --- | --- |
| Container model | Page header card plus a large assistant panel; form area is framed inside the panel. | Open workspace with transcript canvas and a single anchored composer. |
| Card nesting | Empty-state panel, quick action row, textarea, dropdown, and send button feel like nested form controls. | Draft and result panels are purposeful financial outputs; quick actions disappear after the empty state. |
| Hierarchy | `Trợ lý AI` page header competes with `Trợ lý tài chính`; composer controls dominate lower page. | Page title is compact; draft/result content becomes the visual focus. |
| Typography | Mostly uniform card/body scale; monetary review is not the strongest element. | Amount and result headings use stronger monetary typography. |
| Composer | Composer is a form block with separate quick actions and request-type dropdown. | Composer is anchored and conversational, with send control integrated. |
| Technical leakage | `Loại yêu cầu` exposes routing mechanics. | Primary UI hides intent routing; no provider/model/internal fields appear. |
| Navigation | Sidebar is functional but wide and page header repeats brand wording. | Sidebar is narrower and page content starts directly with task context. |
| Mobile behavior | Current mobile route follows the same form-heavy structure. | Mobile concept separates transcript, draft card, composer, and bottom nav zones. |
| Density | Lots of framed whitespace but weak content rhythm. | More purposeful whitespace and fewer, stronger surfaces. |
| Accent color | Green appears mostly as generic status/control styling. | Green is reserved for selected nav, primary actions, and positive/local status. |

## Design System Deliverables

- `docs/design/POCKET_LEDGER_DESIGN_SYSTEM.md`
- `docs/design/POCKET_LEDGER_INTERACTION_SPEC.md`
- `docs/design/POCKET_LEDGER_COPY_GUIDE.md`
- `docs/design/POCKET_LEDGER_VISUAL_QA_CHECKLIST.md`

## Anti-AI-Slop Decisions

- No sparkle, robot, brain, or AI-magic imagery.
- No purple-blue AI gradients.
- No glassmorphism or glow effects.
- No generic bento dashboard.
- No nested card stacks.
- No visible intent/provider/model terminology.
- No unsupported cloud or bank-sync concepts.
- No decorative hero sections inside the product.

## Accessibility Decisions

- Maintain one `h1` per page.
- Use semantic navigation and `aria-current`.
- Keep visible keyboard focus on links, buttons, inputs, and dialogs.
- Do not communicate income/expense, destructive actions, or over-budget state
  by color alone.
- Keep mobile touch targets at least `44px`.
- Preserve safe-area bottom padding for bottom navigation and composer.
- Require no critical or serious axe violations during implementation.

## Implementation Boundaries For TASK-UX-003B

TASK-UX-003B may implement this concept only after approval. It must not:

- add product features;
- add new API behavior;
- add backend or database behavior;
- add authentication or cloud behavior;
- add general-purpose economics chat;
- add persistent chat history;
- add unsupported fields shown only by a raster artifact.

## Package

The review package is `pocket-ledger-ui-concepts.tar.gz`. It includes this task
document, all five design documents, and all images under
`docs/design/concepts/revision-003a/`, including the visual QA checklist.
