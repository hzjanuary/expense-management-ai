# TASK-UX-003B Fidelity Ledger

Browser evidence method: Playwright Chromium container. Browser/IAB was not
available in this environment, so Playwright was used as the documented
fallback. Screenshots were captured only after the visual capture spec asserted
loaded text and absence of relevant loading states.

## Revision 2 Correction Pass

| State | Accepted concept | Browser render | Viewport | Mismatches reviewed | Fixes applied | Intentional deviations | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Assistant empty desktop | `docs/design/concepts/revision-003a/assistant-empty-desktop.png` | `screenshots/assistant-empty-desktop.png` | 1440x900 | Container model, quick actions, composer placement, page shell, icon tone | Removed route-level giant card; quick actions remain empty-only; composer sits on open canvas | Empty-state illustration from concept is simplified to code-native text/actions | PASS |
| Assistant draft desktop | `docs/design/concepts/revision-003a/assistant-draft-desktop.png` | `screenshots/assistant-draft-desktop.png` | 1440x900 | Draft hierarchy, action priority, empty gap, technical field leakage | Draft is amount-first receipt surface; `Xác nhận` primary, `Hủy` quiet; no request-type dropdown | No `Sửa` action because no safe edit flow exists | PASS |
| Assistant draft mobile | `docs/design/concepts/revision-003a/assistant-draft-mobile.png` | `screenshots/assistant-draft-mobile.png` | 390x844 | Composer/nav overlap, action priority, rounded full-page card, quick-action persistence | Mobile uses open page canvas; quick actions hidden after conversation begins; active assistant chrome is compact on mobile; `Xác nhận`, `Hủy`, composer, and bottom nav are visible in the first viewport | Same no-edit deviation | PASS |
| Assistant total result desktop | `docs/design/concepts/revision-003a/assistant-total-result-desktop.png` | `screenshots/assistant-total-result-desktop.png` | 1440x900 | Amount emphasis, period/count, repeated avatar/card treatment, internal field leakage | Result card emphasizes amount and period; no raw `query_scope`, `date_range`, or slug text | Runtime data differs from concept placeholder values | PASS |
| Assistant clarification desktop | `docs/design/concepts/revision-003a/assistant-clarification-desktop.png` | `screenshots/assistant-clarification-desktop.png` | 1440x900 | Compactness, copy, actionability, quick-action persistence | Clarification is compact and actionable; quick actions removed after conversation starts | Uses current supported unknown-intent copy | PASS |
| Assistant provider unavailable desktop | `docs/design/concepts/revision-003a/assistant-provider-unavailable-desktop.png` | `screenshots/assistant-provider-unavailable-desktop.png` | 1440x900 | Separate unavailable state, no mixed live result, safe copy | Provider failure captured as standalone assistant error; no successful result shown in same state | Error produced by mocked same-origin proxy in visual capture | PASS |
| Dashboard desktop | `docs/design/concepts/revision-003a/dashboard-desktop.png` | `screenshots/dashboard-desktop.png` | 1440x900 | 2x2 equal-card grid, balance hierarchy, budget placement, category/recent visibility | Balance is full-width and dominant; compact budget summary follows; category and recent sections appear below as secondary content | Uses real E2E ledger values; dashboard retains month controls | PASS |
| Transactions populated desktop | `docs/design/concepts/revision-003a/transactions-populated-desktop.png` | `screenshots/transactions-populated-desktop.png` | 1440x900 | Separate filter/export/list cards, amount alignment, permanent delete action | Controls collapsed into one compact toolbar; ledger rows use dividers, tabular amounts, overflow menu | Only supported row action is delete | PASS |
| Transactions empty desktop | `docs/design/concepts/revision-003a/transactions-empty-desktop.png` | `screenshots/transactions-empty-desktop.png` | 1440x900 | Empty and populated state conflict, toolbar density | Empty state captured before any transaction exists; no rows shown simultaneously | E2E seed has no manual placeholder data | PASS |
| Transactions populated mobile | `docs/design/concepts/revision-003a/transactions-populated-mobile.png` | `screenshots/transactions-populated-mobile.png` | 390x844 | Row below fold, oversized filters, visible red delete, card-like rows | Removed duplicate intro; filter/export are compact controls; first transaction row appears in first viewport; delete stays in overflow | Month control remains visible because it is current product behavior | PASS |
| Transactions delete sheet mobile | `docs/design/concepts/revision-003a/transactions-delete-sheet-mobile.png` | `screenshots/transactions-delete-sheet-mobile.png` | 390x844 | Backdrop, background inertness, action priority, consequence copy | Bottom sheet uses backdrop, clear consequence copy, primary destructive action and quiet cancel | Focus trap remains lightweight local implementation | PASS |
| Budgets desktop | `docs/design/concepts/revision-003a/budgets-desktop.png` | `screenshots/budgets-desktop.png` | 1440x900 | Loaded state, 0.56% precision, unsupported tip/help card | Loaded state shows total, spent, remaining, setup controls, category row; no education/tip sidebar; setup follows the summary instead of competing as an equal card | Uses current supported edit form fields | PASS |
| Settings desktop | `docs/design/concepts/revision-003a/settings-desktop.png` | `screenshots/settings-desktop.png` | 1440x900 | Text/icon scale, section rhythm, low-level Docker guidance | Settings uses open sections; destructive volume guidance moved into technical disclosure; troubleshooting remains linked | Uses GitHub docs link rather than in-app help center | PASS |
| App shell desktop | `docs/design/concepts/revision-003a/app-shell-desktop.png` | `screenshots/app-shell-desktop.png` | 1440x900 | Sidebar width, selected nav, brand mark, title scale | Compact shell, single wallet mark, active nav treatment, `Trợ lý` label | Inline SVG icons instead of new icon dependency | PASS |
| App shell mobile | `docs/design/concepts/revision-003a/app-shell-mobile.png` | `screenshots/app-shell-mobile.png` | 390x844 | Bottom nav clearance, selected route, horizontal overflow | Bottom nav uses five labelled destinations, safe-area padding, active state | Native browser chrome absent from Playwright screenshot | PASS |
| Shared loading/error/dialog | `docs/design/concepts/revision-003a/shared-dialog-empty-loading-states.png` | `screenshots/shared-loading-error-dialog.png` | 1440x900 | Loading, unavailable, destructive confirmation, and empty state evidence | Rebuilt as a four-panel composite assembled from real browser screenshots of production loading, unavailable, destructive dialog, and empty states | Composite assembly is documentation-only; no state-gallery route was added | PASS |

## Hallmark Audit Results

Hallmark was used in audit mode only. Suggestions were constrained to the
approved Revision 2 concepts and TASK-UX-003B correction requirements; no new
theme, macrostructure, route, action, or feature was accepted.

### Pre-Fix Blocking Findings

| Finding | Severity | Approved-source mapping | Fix |
| --- | --- | --- | --- |
| Assistant draft/result appeared before the user message that produced it | BLOCKING | Assistant active-state chronology | Chat entries now render user message first, then draft/result/clarification/error; tests cover draft, total result, clarification, and unavailable order. |
| Composer retained the submitted message in active screenshots | BLOCKING | Assistant composer behavior | Accepted submissions clear the textarea while preserving sent text in the user bubble; focus returns to composer. |
| Draft receipt showed `-28.000 đ` and hid actions on mobile | BLOCKING | Draft receipt and money-format locks | Draft amount is unsigned `28.000 ₫`; active mobile chrome and receipt density were reduced so `Xác nhận` and `Hủy` are visible. |
| Clarification and unavailable states were generic strips | BLOCKING | Assistant clarification/error concepts | Clarification uses `Cần thêm thông tin`; provider unavailable uses standalone `Trợ lý chưa sẵn sàng` with `Thử lại` and `Mở Cài đặt`. |
| Shared-state evidence only showed an overflow menu | BLOCKING | Required evidence inventory | Replaced with four real-browser panels: loading, unavailable, destructive dialog, empty state. |
| Transactions mobile first viewport was dominated by controls | BLOCKING | Transactions mobile concept | Reworked to compact filter/export controls and a ledger row in the first viewport. |

### Post-Fix Audit

| Area | Status | Remaining issue |
| --- | --- | --- |
| Card nesting and container model | NON-BLOCKING | Some functional result surfaces remain bordered, as approved for drafts, insights, budget summary, and dialogs. No route-level giant assistant card remains. |
| Visual hierarchy | NON-BLOCKING | Dashboard and budgets follow the approved dominant-summary hierarchy; transactions use ledger rows. |
| Typography and token consistency | NON-BLOCKING | Uses the approved token family and `₫` money format. |
| Whitespace and density | NON-BLOCKING | Assistant desktop remains intentionally calm/open; mobile draft is dense enough for actions without hiding required data. |
| Action priority | NON-BLOCKING | `Xác nhận` is primary, `Hủy` quiet; transaction delete is behind overflow. |
| Responsive behavior | NON-BLOCKING | Required mobile first-viewport states now show useful content. |
| Fabricated/unsupported content | NON-BLOCKING | No unsupported view/edit/reset/help-center/provider actions were added. |
| Accessibility-visible states | NON-BLOCKING | Active nav, focusable controls, labelled composer, dialogs, alerts, and status states remain visible/semantic. |
| AI-slop visual patterns | NON-BLOCKING | No sparkle, robot, brain, magic-wand, glow, glassmorphism, or purple-blue AI treatment. |

## Material Mismatches Fixed In This Pass

- Assistant route no longer wraps the header, transcript, and composer in one
  giant bordered card.
- Assistant mobile no longer uses a full-page rounded card; content uses the
  page canvas directly.
- Dashboard final and loading structures no longer use a 2x2 equal-card
  hierarchy.
- Dashboard loaded screenshot is captured after summary, budget, category, and
  recent transaction data resolve.
- Transactions desktop controls are one compact toolbar rather than separate
  filter/export/list cards.
- Transactions mobile now shows the populated row in the first viewport.
- Mobile delete remains behind an overflow menu and opens a backdrop sheet.
- Budgets loaded state shows accurate progress precision, including `0,56%`
  for `28.000 / 5.000.000` when that ledger state is present.
- Settings hides destructive Docker volume guidance behind a technical
  disclosure instead of leading with it.
- Frontend auto-routing now recognizes aggregate current-month spending wording
  such as wallet-decrease language, so the real-Ollama total-spending smoke
  reaches the existing backend query endpoint instead of stopping at a
  clarification.

## Real Ollama Smoke Evidence

- `screenshots/real-ollama-total-smoke.png`: `/assistant` with
  `qwen3:4b-instruct`; frontend called `/api/ai/query-spending`, backend
  returned 200 in about 19 seconds, total result rendered, and no internal
  fields were visible.
- `screenshots/real-ollama-draft-smoke.png`: `/assistant` with
  `qwen3:4b-instruct`; frontend called `/api/ai/parse`, backend returned 200 in
  about 16.6 seconds, draft rendered with `28.000 ₫`, `Cơm gà`, `Ăn uống`, and
  `Chưa được lưu`.
- `screenshots/real-ollama-draft-mobile-smoke.png`: the same real-Ollama draft
  at 390x844, with `Xác nhận` and `Hủy` visible above the composer and bottom
  navigation.
- Ledger snapshot before and after the smoke was unchanged. The generated draft
  was canceled and no confirmation endpoint was called.
- Backend logs show outbound `POST http://host.docker.internal:11434/api/chat`
  with `HTTP/1.1 200 OK` for both query-spending and parse. The local
  user/system journal did not expose Ollama service entries in this run.

## Anti-Slop Checklist

- No sparkle, robot, brain, magic-wand, glow, glassmorphism, or purple-blue AI
  treatment was added.
- No unsupported account, payment method, overdue, waiting-for-classification,
  edit, restore, reset, or help-center feature was added.
- No visible request intent dropdown remains.
- No raw internal fields are rendered in assistant results or clarifications.
- No permanent destructive transaction row button remains.
- Existing same-origin proxies and backend contracts are unchanged.
