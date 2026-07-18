# Pocket Ledger AI UX Flows

Source input: `docs/product/expense-ai/SPEC.md`

## Dashboard Flow

1. User opens the dashboard.
2. App shows a compact overview: current balance, monthly income, monthly expense, monthly budget summary, recent transaction preview, and quick actions.
3. Dashboard totals are computed from local ledger records.
4. Recent transactions exclude soft-deleted records.
5. Full transaction management, budget editing, assistant chat, export, and privacy controls live on separate pages.

## Navigation Flow

1. User opens `/dashboard`.
2. Desktop users navigate with the persistent sidebar.
3. Mobile users navigate with the bottom navigation.
4. Primary navigation labels are user-facing Vietnamese labels: `Tổng quan`, `Giao dịch`, `Ngân sách`, `Trợ lý AI`, and `Cài đặt`.
5. Each page loads fresh data from the backend rather than relying on authoritative frontend financial state.

## Manual Transaction Flow

1. User opens manual transaction entry.
2. User selects expense or income.
3. User enters amount, currency, category, description, and occurred date.
4. App validates amount, currency, category, and date.
5. App creates the transaction through the deterministic ledger command handler.
6. Dashboard and history update from persisted ledger data.

## Chat-To-Ledger Flow

1. User opens `/assistant`.
2. User types `Hôm nay tôi tiêu 35k vào ăn trưa`.
3. App sends the message to the parse API.
4. Local provider returns structured output.
5. Application code normalizes `35k` to `35000`, maps category to `food`, and resolves the local date.
6. App shows either saved confirmation, confirmation request, or clarification.
7. A ledger transaction is created only after deterministic validation and required confirmation.
8. Dashboard totals and recent transactions update after confirmation.

Saved confirmation example:

```text
Đã ghi: -35.000đ - Food - Ăn trưa - Hôm nay
```

Confirmation request example:

```text
Mình hiểu là bạn muốn ghi chi tiêu 35.000đ cho ăn trưa. Xác nhận?
```

Clarification example:

```text
Bạn muốn ghi khoản này vào ngày nào?
```

## Clarification And Confirmation Flow

1. Parse result is missing required data, ambiguous, low confidence, or attempts an unsupported mutation.
2. App does not mutate the ledger.
3. Assistant asks a targeted clarification or presents a confirm/edit/cancel action.
4. User confirms, edits, or cancels.
5. Only a confirmed valid draft can enter the ledger command handler.

## Spending Query Flow

1. User asks a natural-language spending question, such as `Tháng này tôi ăn uống hết bao nhiêu?`.
2. App uses the LLM only to classify intent and extract date/category when helpful.
3. App computes totals from local non-deleted transactions.
4. Assistant answers with amount and date range.
5. Assistant must not fabricate totals or budgets when no matching records exist.

## Budget Setup Flow

1. User opens `/budgets`.
2. User selects a month.
3. User configures total monthly budget and expense-category budgets.
4. App validates integer VND values and supported expense categories.
5. App saves through the existing budget API.
6. Budget progress refreshes from backend-computed values.

## Data Management Flow

1. User opens `/transactions` to review active transactions, apply filters, export CSV/JSON, or soft-delete an incorrect transaction.
2. Soft deletion requires explicit confirmation, keeps the transaction row stored locally, hides it from active views, and reverses the stored account-balance effect through the backend.
3. User opens `/settings` to clear local AI draft/history records.
4. Clearing AI history requires explicit confirmation and does not delete confirmed ledger transactions, account balances, budgets, exports, or active ledger data.

## Assistant Scope

The assistant is not a general-purpose economics chatbot. It supports the
implemented transaction-draft and financial-insight intents and safely clarifies
unsupported requests.

## Demo Flow

Seed data:

- Opening balance: `1000000` VND.
- Monthly food budget: `2000000` VND.
- No existing transactions.

Expected demo:

1. Dashboard shows balance `1000000` VND.
2. User records `Hôm nay tôi tiêu 35k vào ăn trưa`.
3. User confirms the food expense draft.
4. Dashboard shows balance `965000` VND, monthly expense `35000` VND, food spent `35000` VND, and food remaining `1965000` VND.
5. User asks `Tháng này tôi ăn uống hết bao nhiêu?`.
6. Assistant answers from database totals.
