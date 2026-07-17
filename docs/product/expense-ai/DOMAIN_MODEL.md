# Pocket Ledger AI Domain Model

Source input: `docs/product/expense-ai/SPEC.md`

## Rules

- Money must never be represented or persisted as a float.
- MVP default currency is `VND`.
- Account currency and transaction currency must match in MVP.
- Transaction amounts must be positive.
- Expense decreases account balance.
- Income increases account balance.
- Soft-deleting an expense increases account balance by the original amount.
- Soft-deleting an income decreases account balance by the original amount.
- Transfer moves money between accounts without changing net worth.
- Deleted transactions are soft-deleted with `deleted_at`.
- Budget spent and remaining values should be computed from transactions in MVP to avoid drift.

## Money

```text
Money
- amount_minor: integer
- currency: string
```

Examples:

- `35000` VND is `amount_minor = 35000`, `currency = "VND"`.
- `12.50` USD is `amount_minor = 1250`, `currency = "USD"`.

## Account

```text
Account
- id
- name
- currency
- opening_balance_minor
- current_balance_minor
- created_at
- updated_at
```

Default account:

```text
Cash Wallet
```

## Category

```text
Category
- id
- name
- slug
- type: expense | income | transfer
- monthly_budget_minor
- is_system
- created_at
- updated_at
```

Default expense categories:

- food
- coffee
- transport
- shopping
- bills
- rent
- health
- education
- entertainment
- other

Default income categories:

- salary
- bonus
- gift
- other_income

## Transaction

```text
Transaction
- id
- account_id
- type: expense | income | transfer
- amount_minor
- currency
- category_id
- description
- merchant
- occurred_at
- source: manual | ai_chat | import
- raw_user_text
- parser_confidence
- created_at
- updated_at
- deleted_at
```

Validation:

- `amount_minor` is required and must be greater than zero.
- `currency` is required and supported.
- `category_id` must match the transaction type.
- `occurred_at` must be a valid timestamp.
- `source` must identify the mutation origin.
- `deleted_at` is set only by the soft-delete command.
- Soft delete must not change original amount, category, description, source, or occurrence timestamp.
- Soft delete reverses the stored account balance effect atomically with setting `deleted_at`.

## BudgetPeriod

```text
BudgetPeriod
- id
- month
- year
- currency
- total_budget_minor
- created_at
- updated_at
```

Validation:

- Month/year identify the budget period.
- `total_budget_minor` must be zero or positive.
- Currency must match the account/reporting currency in MVP.

## CategoryBudget

```text
CategoryBudget
- id
- budget_period_id
- category_slug
- budget_minor
- spent_minor
- remaining_minor
```

MVP rule:

- `budget_minor` may be stored.
- `spent_minor` and `remaining_minor` should be computed from non-deleted transactions.
- Budget setup stores valid expense category slugs only.
- Income categories and unknown category slugs are rejected for category budgets.
- One category budget may exist per budget period and category slug.
- Remaining budget views compute category spending from non-deleted expense transactions in the selected month.
- Income transactions, soft-deleted transactions, and transactions outside the selected month do not count as category spending.
- Total monthly expense includes all non-deleted monthly expense transactions, including unbudgeted categories.

## ChatMessage

```text
ChatMessage
- id
- role: user | assistant | system
- content
- created_at
```

Retention:

- Chat history is local.
- Users must be able to clear AI/chat history without deleting ledger transactions.

## AiParseAttempt

```text
AiParseAttempt
- id
- raw_text
- provider
- model
- parsed_json
- validation_status: valid | invalid | needs_confirmation
- error_message
- created_transaction_id
- created_at
```

Rules:

- A parse attempt may create a draft, not a transaction.
- `created_transaction_id` is set only after a confirmed draft creates a ledger transaction.
- Raw text may be stored for debugging, but clearing AI history must remove it.
