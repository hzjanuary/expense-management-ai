# Pocket Ledger Design System

Status: revised draft for TASK-UX-003A approval. Do not treat this as
implemented UI.

## Direction

Pocket Ledger should feel like a calm, precise personal-finance product. Ledger
data and deterministic financial actions are primary. AI is an assistant
capability, not the brand motif.

Use `docs/design/concepts/revision-003a/` as the visual reference for
container model, hierarchy, component anatomy, spacing, navigation, and action
priority. This document clarifies exact tokens and rejects accidental raster
copy/glyph artifacts only; it does not authorize major implementation drift.

## Tokens

### Color

| Token | Value | Use |
| --- | --- | --- |
| `app.background` | `#F7F9F6` | App canvas and sidebar background |
| `surface.primary` | `#FFFFFF` | Main content, tables, dialogs |
| `surface.subtle` | `#EEF7F0` | Selected nav and gentle status fills |
| `surface.elevated` | `#FFFFFF` | Dialogs, sticky composer, bottom nav |
| `text.primary` | `#111827` | Primary copy and monetary values |
| `text.secondary` | `#4B5563` | Helper text and labels |
| `text.muted` | `#6B7280` | Secondary metadata |
| `border.default` | `#DDE4DC` | Rows, controls, panels |
| `border.strong` | `#BFCABE` | Active input/control borders |
| `accent.default` | `#1F7A4D` | Primary action, selected nav |
| `accent.hover` | `#17663F` | Primary hover |
| `accent.soft` | `#E8F5EC` | Selected/positive backgrounds |
| `success.default` | `#16803A` | Success text/status |
| `warning.default` | `#B7791F` | Clarification/near-limit state |
| `warning.soft` | `#FFF7E6` | Clarification background |
| `danger.default` | `#C62828` | Destructive action text/background |
| `danger.hover` | `#A61F1F` | Destructive hover |
| `danger.soft` | `#FEE2E2` | Destructive alert background |
| `focus.ring` | `#1F7A4D` | Keyboard focus outline |

Do not use purple-blue AI gradients, glowing accents, glass effects, dotted
grids, or decorative background patterns.

### Typography

Use a system-native stack first:

```css
font-family:
  Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;
```

Do not add or redistribute font files.

| Role | Size | Weight | Line height | Notes |
| --- | ---: | ---: | ---: | --- |
| Page title | 32px desktop / 30px mobile | 650-700 | 1.15 | One `h1` per page |
| Section title | 18-20px | 650 | 1.3 | Compact, not hero-sized |
| Body | 15-16px | 400 | 1.55 | Default readable copy |
| Secondary text | 14px | 400 | 1.45 | Helper and description |
| Caption | 12-13px | 500 | 1.4 | Metadata |
| Control text | 14-15px | 600 | 1.2 | Buttons, nav, inputs |
| Table row | 14-15px | 400-550 | 1.4 | Ledger rows |
| Monetary value | 28-48px | 650-750 | 1.05 | Use tabular numerals |

Use `font-variant-numeric: tabular-nums` for monetary values, table amounts,
and dates. Letter spacing remains `0`.

### Spacing

Base unit: `4px`.

| Token | Value | Use |
| --- | ---: | --- |
| `space.1` | 4px | Tight icon/text gaps |
| `space.2` | 8px | Control internal gaps |
| `space.3` | 12px | Form row gaps |
| `space.4` | 16px | Row padding and compact groups |
| `space.5` | 20px | Section internal padding |
| `space.6` | 24px | Section gaps |
| `space.8` | 32px | Desktop page gutter and major rhythm |
| `space.10` | 40px | Large page breaks only |

Desktop page gutter: `32px`. Small laptop gutter: `24px`. Mobile gutter:
`20px`, with bottom padding for fixed navigation and assistant composer.

### Geometry And Elevation

| Token | Value | Use |
| --- | ---: | --- |
| `radius.control` | 6px | Buttons, inputs, nav items |
| `radius.surface` | 8px | Main surfaces, rows, panels |
| `radius.dialog` | 10px desktop / 16px mobile sheet top | Dialog and bottom sheet |
| `border.width` | 1px | Most surfaces |
| `shadow.none` | none | Default |
| `shadow.soft` | `0 1px 2px rgba(17, 24, 39, 0.04)` | Sticky composer/nav only |
| `shadow.dialog` | `0 16px 40px rgba(17, 24, 39, 0.16)` | Dialogs |

Avoid large rounded corners, stacked elevated cards, and giant page wrappers.
Prefer rows, dividers, open layout, and one purposeful surface per section.

### Motion

- Duration: `120ms` for hover/focus, `180ms` for opening dialogs.
- Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- Respect `prefers-reduced-motion`; disable nonessential transitions.
- Motion should clarify state only: dialog enter, row hover, loading skeleton.

### Iconography

Use the existing simple outline icon style or lucide-equivalent icons.

- Default size: `20px`.
- Small inline size: `16px`.
- Large empty-state size: `40-48px`.
- Stroke width: `1.75-2px`.
- Active icons use `accent.default`.
- Destructive icons use `danger.default`.
- Assistant icon is a plain chat/message icon across desktop and mobile.

Prohibited: sparkle icons, robot icons, brain icons, AI magic symbols,
decorative random icons, and icons that invent unsupported concepts.

## Components

### App Shell

Desktop shell:

- Sidebar width: `232px`.
- Product identity is compact; no oversized logo.
- Nav items are semantic links with icon + label.
- Selected state uses a `3px` left rail plus soft accent background and
  `aria-current`.
- Main content is open and max-width constrained, not wrapped in one giant card.
- Local-first status may appear as quiet sidebar footer text.

Mobile shell:

- Bottom navigation with five destinations.
- Touch targets at least `44px`.
- Safe-area padding.
- Main content includes enough bottom padding for nav and sticky composer.

### Buttons

Heights:

- Small: `36px`
- Default: `40px`
- Large: `44px`
- Icon: `40px x 40px`

Variants:

- Primary: green filled, used for the one dominant action.
- Secondary: neutral surface with border.
- Outline: white surface with border.
- Ghost: text/transparent for low-emphasis actions.
- Danger: red filled or red text, only for destructive confirmation.

All buttons use inline-flex alignment, stable height during loading, visible
focus ring, and long-label wrapping rules.

### Forms

- Inputs/selects are `40-44px` high with visible labels.
- Validation text appears below the related control.
- Do not format active amount inputs in a way that moves the caret.
- Month controls remain compact and visible.

### Ledger Rows

Desktop:

- Use a table/list surface with row dividers.
- Right-align amounts.
- Include textual type: `Chi` or `Thu`.
- Row action is an overflow menu.
- Delete is not permanently visible on each row.

Mobile:

- Use one shared ledger-list surface with dividers.
- Description and amount are primary.
- Date, category, and type are secondary plain metadata.
- Row action is an overflow menu.
- Delete confirmation is a bottom sheet with an inert backdrop.

### Assistant Draft Review

The draft review is a compact receipt/editor:

- Amount is the primary value.
- Description sits directly below or beside the amount.
- Type, category, date, and optional merchant are secondary rows.
- Include explicit note: `Chưa được lưu. Chỉ ghi vào sổ khi bạn xác nhận.`
- Primary action: `Xác nhận`.
- Secondary action: `Sửa`, only when a safe edit affordance exists.
- Tertiary action: `Hủy`.

Never show internal fields such as `intent`, `category_slug`, `amount_minor`,
`transaction_type`, `occurred_at_iso`, or `missing_fields`.

### Insight Result

Total result:

- Title: `Tổng chi tiêu`.
- Show period, amount, transaction count.
- Do not show a category field.

Category result:

- Title: `Chi tiêu theo danh mục`.
- Show Vietnamese category label, period, amount, transaction count.

Budget result and breakdown result must present backend fields without
frontend-calculated totals.

### Dialogs And Bottom Sheets

- Desktop destructive confirmation uses a centered dialog.
- Mobile destructive confirmation uses a bottom sheet.
- Dialogs need accessible title and description.
- Destructive copy must state what changes and what remains.
- Red is reserved for the final destructive confirmation, not the pre-confirm
  row action.

### Empty, Loading, Error

Empty states are plain and actionable:

- `Chưa có giao dịch`
- `Không tìm thấy giao dịch`
- `Chưa thiết lập ngân sách`

Loading states use skeleton rows with stable layout. Errors use safe Vietnamese
copy and a `Thử lại` action when applicable.
