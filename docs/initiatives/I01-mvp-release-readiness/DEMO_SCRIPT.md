# I01 Demo Script

## Deterministic Seed State

```text
Opening balance: 1,000,000 VND
Monthly total budget: 5,000,000 VND
Food category budget: 2,000,000 VND
Existing transactions: none
AI provider for normal demo proof: deterministic fake/local provider
```

## Demo Transaction

```text
Hôm nay tôi tiêu 35k vào ăn trưa
```

Expected parsed draft:

```text
type: expense
amount_minor: 35,000
currency: VND
category_slug: food
description: ăn trưa
source: ai_chat
```

## Demo Flow

1. Start the local backend and frontend through the documented runtime workflow.
2. Apply Alembic migrations to the demo SQLite database.
3. Open the dashboard.
4. Verify opening balance displays `1,000,000 VND`.
5. Configure monthly total budget as `5,000,000 VND`.
6. Configure food category budget as `2,000,000 VND`.
7. Type `Hôm nay tôi tiêu 35k vào ăn trưa` in the chat input.
8. Inspect the parsed AI draft.
9. Explicitly confirm the draft.
10. Verify the new transaction appears in Recent Transactions without a full
    page reload.
11. Verify dashboard and budget state after confirmation:

```text
Account balance: 965,000 VND
Monthly expense: 35,000 VND
Food spent: 35,000 VND
Food remaining: 1,965,000 VND
```

12. Ask insight question:

```text
Tháng này tôi ăn uống hết bao nhiêu?
```

Expected result:

```text
amount_minor: 35,000
transaction_count: 1
answer references 35,000 VND from database totals
```

13. Ask budget insight question:

```text
Còn bao nhiêu tiền ăn tháng này?
```

Expected result:

```text
budget_minor: 2,000,000
spent_minor: 35,000
remaining_minor: 1,965,000
is_over_budget: false
```

14. Ask breakdown insight question:

```text
Tuần này tôi tiêu nhiều nhất vào mục nào?
```

Expected result:

```text
top_category.category_slug: food
top_category.amount_minor: 35,000
total_expense_minor: 35,000
```

15. Export transactions as CSV and JSON.
16. Verify export includes the confirmed `ai_chat` transaction and does not
    include AI draft raw text or provider metadata.
17. Soft-delete the transaction through the user-facing data-management UI.
18. Verify:

```text
Account balance: 1,000,000 VND
Monthly expense: 0 VND
Food spent: 0 VND
Food remaining: 2,000,000 VND
Recent Transactions no longer shows the deleted transaction by default
Insights no longer count the deleted transaction
Exports no longer include the deleted transaction
```

19. Clear AI history through the privacy action.
20. Verify clear AI history reports success and does not delete ledger records.
21. Verify the soft-deleted transaction remains soft-deleted and account balance
    remains `1,000,000 VND`.

## Pass Condition

The demo passes only when every expected state is visible in the UI or proven by
the E2E assertions without relying on a real Ollama installation.

