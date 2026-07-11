# SPEC: Local-First AI Expense Manager

## 1. Product Name

**Pocket Ledger AI**
A local-first expense management application with an embedded local LLM/SLM assistant for natural-language transaction entry, budgeting, and personal finance insights.

## 2. One-Line Product Contract

Users can chat naturally with a local AI assistant to record expenses, income, transfers, budgets, and spending queries; the system converts natural language into validated financial records and updates monthly/category totals only after deterministic validation and user confirmation when needed.

Example:

> “Hôm nay tôi tiêu 35k vào ăn trưa.”

Expected result:

```json
{
  "intent": "create_transaction",
  "transaction_type": "expense",
  "amount_minor": 35000,
  "currency": "VND",
  "category": "food",
  "description": "ăn trưa",
  "occurred_at": "today",
  "confidence": "high"
}
```

After accepted:

* Total available balance decreases by 35,000 VND.
* Monthly food spending increases by 35,000 VND.
* Monthly total expense increases by 35,000 VND.
* The transaction appears in transaction history and dashboard charts.

## 3. Product Goals

### 3.1 MVP Goals

1. Let users create expenses using chat.
2. Support local LLM/SLM parsing through a provider abstraction.
3. Store financial data locally first.
4. Track monthly budgets by category.
5. Show dashboard totals: total balance, monthly income, monthly expense, category spending, remaining budget.
6. Require deterministic validation before any transaction mutates the ledger.
7. Provide manual transaction entry as fallback when AI parsing fails.

### 3.2 Non-MVP Goals

1. Bank sync.
2. Cloud account sync.
3. Multi-user household finance.
4. Investment portfolio tracking.
5. Tax reports.
6. Receipt OCR.
7. Voice input.
8. Mobile native app.
9. Fine-tuning local models.
10. Automatic transaction creation without validation/confirmation.

## 4. Target Users

### Persona 1: Personal Budget Tracker

A user who wants to quickly record daily spending without opening many forms.

Needs:

* Fast entry.
* Vietnamese language support.
* Category totals.
* Monthly budget warnings.

### Persona 2: Privacy-Conscious User

A user who does not want financial data sent to cloud LLM providers.

Needs:

* Local model execution.
* Local database.
* Export/delete data.
* Clear privacy boundary.

### Persona 3: Power User

A user who wants searchable transaction history and spending insights.

Needs:

* Ask: “Tháng này tôi ăn ngoài hết bao nhiêu?”
* Ask: “Tuần này tôi tiêu nhiều nhất ở mục nào?”
* Ask: “Còn bao nhiêu tiền ăn trong tháng?”

## 5. Harness Intake Classification

Input type: **New spec**

Initial risk lane: **High-risk**

Reason:

* Touches data model.
* Touches user financial data.
* Touches local AI provider behavior.
* Touches public API contracts.
* Touches audit/validation behavior.
* Mistakes can create incorrect financial records.

Harness handling:

* Create product docs under `docs/product/expense-ai/`.
* Create story packets under `docs/stories/`.
* Update `docs/TEST_MATRIX.md`.
* Create architecture decisions under `docs/decisions/`.
* Do not begin implementation before product contract, story packets, and validation expectations exist.

## 6. Recommended Repository Artifacts

Create these files first:

```text
docs/
  product/
    expense-ai/
      SPEC.md
      PRODUCT_CONTRACT.md
      DOMAIN_MODEL.md
      LLM_CONTRACT.md
      API_CONTRACT.md
      PRIVACY_SECURITY.md
      UX_FLOWS.md
  stories/
    epics/
      E01-foundation/
      E02-ledger-domain/
      E03-ai-transaction-entry/
      E04-budget-dashboard/
      E05-chat-insights/
  decisions/
    0001-local-first-stack.md
    0002-llm-provider-abstraction.md
    0003-ledger-mutation-safety.md
```

## 7. Recommended Tech Stack

### 7.1 MVP Stack

Frontend:

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query or SWR for data fetching

Backend:

* FastAPI
* Python 3.12+
* Pydantic v2
* SQLAlchemy async
* Alembic

Database:

* SQLite for local-first MVP
* Optional PostgreSQL adapter later

Local AI:

* Ollama as first local provider
* llama.cpp server as second provider later
* Provider interface must support structured JSON output

Packaging:

* Web app first
* Desktop wrapper with Tauri or Electron later

Testing:

* pytest
* ruff
* black
* mypy
* frontend unit tests
* Playwright for E2E

### 7.2 Why This Stack

FastAPI + Pydantic is a good fit because the most important backend task is parsing unsafe/unknown AI output into strict typed commands before mutating data.

SQLite is enough for local-first finance data and keeps the MVP simple.

Ollama is the first local LLM provider because it supports structured outputs using JSON Schema. llama.cpp server can be added later because it exposes OpenAI-compatible endpoints and supports schema-constrained JSON response format.

## 8. Core Domain Model

### 8.1 Money

Money must never be stored as float.

```text
Money
- amount_minor: integer
- currency: string
```

Examples:

* 35,000 VND => `amount_minor = 35000`, `currency = "VND"`
* 12.50 USD => `amount_minor = 1250`, `currency = "USD"`

For MVP, default currency is `VND`.

### 8.2 Account

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

### 8.3 Category

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

* food
* coffee
* transport
* shopping
* bills
* rent
* health
* education
* entertainment
* other

Default income categories:

* salary
* bonus
* gift
* other_income

### 8.4 Transaction

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

Rules:

* Expense decreases account balance.
* Income increases account balance.
* Transfer moves money between accounts without changing net worth.
* Transaction amount must be positive.
* Transaction currency must match account currency for MVP.
* Soft delete only; no hard delete in MVP.

### 8.5 Budget Period

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

### 8.6 Category Budget

```text
CategoryBudget
- id
- budget_period_id
- category_id
- budget_minor
- spent_minor
- remaining_minor
```

`spent_minor` and `remaining_minor` may be computed from transactions instead of stored. MVP should prefer computed values to avoid drift.

### 8.7 Chat Message

```text
ChatMessage
- id
- role: user | assistant | system
- content
- created_at
```

### 8.8 AI Parse Attempt

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

## 9. LLM Contract

### 9.1 Rule: LLM Does Not Write Directly

The LLM/SLM must never write to the database directly.

Allowed flow:

```text
User text
  -> LLM structured extraction
  -> Pydantic/Zod schema validation
  -> business rule validation
  -> optional confirmation
  -> command handler
  -> database transaction
  -> recalculated dashboard totals
```

### 9.2 Supported Intents

MVP intents:

```text
create_transaction
query_spending
set_budget
unknown
```

Post-MVP intents:

```text
update_transaction
delete_transaction
create_recurring_transaction
import_transactions
export_report
```

### 9.3 Transaction Parse Schema

```json
{
  "intent": "create_transaction",
  "transaction_type": "expense",
  "amount_minor": 35000,
  "currency": "VND",
  "category_slug": "food",
  "description": "ăn trưa",
  "merchant": null,
  "occurred_at_text": "hôm nay",
  "occurred_at_iso": null,
  "needs_confirmation": false,
  "confidence": "high",
  "missing_fields": []
}
```

### 9.4 Required Validation Rules

The backend must reject parsed output if:

* amount is missing
* amount is zero or negative
* currency is unsupported
* category does not exist and cannot be mapped to `other`
* transaction type is unknown
* occurred date is invalid
* parsed intent is unsupported

### 9.5 Confirmation Rules

The app must ask for confirmation when:

* confidence is low
* amount is ambiguous
* category is ambiguous
* date is ambiguous
* currency is not explicit and user default currency is unknown
* user asks to edit/delete existing financial data
* LLM output changes more than one financial object

Example confirmation:

```text
Mình hiểu là bạn đã chi 35.000₫ cho ăn trưa, mục Food, hôm nay. Ghi lại nhé?
```

Actions:

```text
Confirm
Edit
Cancel
```

### 9.6 Vietnamese Amount Parsing

The system must support common Vietnamese shorthand:

```text
35k -> 35000
35 nghìn -> 35000
35 ngàn -> 35000
1tr -> 1000000
1 triệu -> 1000000
1m -> 1000000
```

LLM may help extract this, but final normalization must be deterministic in application code.

## 10. API Contract

### 10.1 Health

```http
GET /health
```

Returns:

```json
{
  "status": "ok"
}
```

### 10.2 Create Manual Transaction

```http
POST /api/v1/transactions
```

Request:

```json
{
  "type": "expense",
  "amount_minor": 35000,
  "currency": "VND",
  "category_slug": "food",
  "description": "ăn trưa",
  "occurred_at": "2026-07-11T12:00:00+07:00",
  "source": "manual"
}
```

Response:

```json
{
  "id": "uuid",
  "type": "expense",
  "amount_minor": 35000,
  "currency": "VND",
  "category_slug": "food",
  "description": "ăn trưa",
  "occurred_at": "2026-07-11T12:00:00+07:00"
}
```

### 10.3 List Transactions

```http
GET /api/v1/transactions?month=2026-07&category=food
```

### 10.4 Parse Chat Message

```http
POST /api/v1/ai/parse
```

Request:

```json
{
  "message": "Hôm nay tôi tiêu 35k vào ăn trưa"
}
```

Response:

```json
{
  "intent": "create_transaction",
  "draft": {
    "type": "expense",
    "amount_minor": 35000,
    "currency": "VND",
    "category_slug": "food",
    "description": "ăn trưa",
    "occurred_at": "2026-07-11T12:00:00+07:00"
  },
  "needs_confirmation": false,
  "confidence": "high"
}
```

### 10.5 Confirm AI Draft

```http
POST /api/v1/ai/confirm
```

Request:

```json
{
  "draft_id": "uuid"
}
```

Response:

```json
{
  "transaction_id": "uuid",
  "balance_minor": 965000,
  "monthly_food_spent_minor": 35000
}
```

### 10.6 Dashboard Summary

```http
GET /api/v1/dashboard/summary?month=2026-07
```

Response:

```json
{
  "currency": "VND",
  "total_balance_minor": 965000,
  "monthly_income_minor": 0,
  "monthly_expense_minor": 35000,
  "category_breakdown": [
    {
      "category_slug": "food",
      "spent_minor": 35000,
      "budget_minor": 2000000,
      "remaining_minor": 1965000
    }
  ]
}
```

### 10.7 LLM Provider Status

```http
GET /api/v1/ai/providers/status
```

Response:

```json
{
  "active_provider": "ollama",
  "active_model": "qwen2.5:3b",
  "available": true
}
```

## 11. UI Surfaces

### 11.1 Dashboard

Must show:

* Current balance
* Monthly income
* Monthly expense
* Remaining monthly budget
* Category spending list
* Recent transactions
* Quick chat input

### 11.2 Chat Entry Panel

User can type:

```text
Hôm nay tôi tiêu 35k vào ăn trưa
```

Assistant responds with either:

1. Saved confirmation:

```text
Đã ghi: -35.000₫ · Food · Ăn trưa · Hôm nay
```

2. Confirmation request:

```text
Mình hiểu là bạn muốn ghi chi tiêu 35.000₫ cho ăn trưa. Xác nhận?
```

3. Clarification:

```text
Bạn muốn ghi khoản này vào ngày nào?
```

### 11.3 Transaction History

Must support:

* Filter by month
* Filter by category
* Filter by type
* Search description
* Edit transaction
* Soft delete transaction

### 11.4 Budget Settings

Must support:

* Set total monthly budget
* Set category monthly budget
* See budget remaining

## 12. Privacy and Security Contract

1. Financial data is stored locally by default.
2. Local LLM provider is default.
3. Cloud LLM providers are not enabled in MVP.
4. User must see which model/provider is active.
5. App must not send transaction data to external providers unless user explicitly enables cloud mode in a future version.
6. Deleted transactions are soft-deleted.
7. Export must be user-triggered.
8. Logs must not include full transaction descriptions by default.
9. AI parse attempts may store raw user text for debugging, but user must be able to clear AI history.

## 13. Product Phases

## Phase 0: Harness Product Intake

Goal: Convert this SPEC into harness-ready docs before implementation.

Stories:

### US-001: Create Product Contract

As a developer, I want a stable product contract so future coding agents understand the intended app behavior.

Acceptance Criteria:

* `docs/product/expense-ai/PRODUCT_CONTRACT.md` exists.
* It describes MVP scope, non-MVP scope, user flows, and mutation safety.
* It includes the example “Hôm nay tôi tiêu 35k vào ăn trưa.”
* It clearly states that LLM cannot directly write to DB.
* It links to domain, LLM, API, privacy, and UX docs.

### US-002: Create Harness Story Backlog

As a developer, I want story packets for each MVP slice so Codex can implement incrementally.

Acceptance Criteria:

* `docs/stories/epics/` includes E01 to E05 folders.
* Each story file follows `docs/templates/story.md`.
* High-risk stories use the high-risk template if they touch LLM mutation, data model, privacy, or API contract.
* `docs/TEST_MATRIX.md` has planned rows for all MVP stories.

### US-003: Record Architecture Decisions

As a developer, I want durable decisions so future agents inherit stack choices.

Acceptance Criteria:

* `docs/decisions/0001-local-first-stack.md` exists.
* `docs/decisions/0002-llm-provider-abstraction.md` exists.
* `docs/decisions/0003-ledger-mutation-safety.md` exists.
* Each decision includes context, decision, alternatives, consequences, and follow-up.

## Phase 1: Application Foundation

Goal: Create the runnable app skeleton.

Stories:

### US-101: Backend Bootstrap

As a developer, I want a FastAPI backend with health checks so the app has a stable API foundation.

Acceptance Criteria:

* Backend starts locally.
* `GET /health` returns `{ "status": "ok" }`.
* Settings are typed and environment-driven.
* JSON logging includes request id.
* Unit tests pass.
* Lint and formatting checks pass.

### US-102: Frontend Bootstrap

As a user, I want a basic web shell so I can open the app in the browser.

Acceptance Criteria:

* Next.js app starts locally.
* Dashboard route exists.
* Chat input placeholder exists.
* Transaction history placeholder exists.
* Budget settings placeholder exists.
* Frontend lint/typecheck passes.

### US-103: Local Database Setup

As a developer, I want a local database and migrations so financial records can persist.

Acceptance Criteria:

* SQLite database works locally.
* SQLAlchemy models are connected.
* Alembic migrations run from base to head.
* Test database uses isolated temporary DB.
* No domain table is created without migration coverage.

## Phase 2: Ledger Domain

Goal: Implement deterministic finance behavior before adding AI.

Stories:

### US-201: Money and Category Domain Rules

As a developer, I want strict money/category rules so financial math is safe.

Acceptance Criteria:

* Money uses integer minor units only.
* Float amounts are rejected.
* Default VND currency exists.
* Default categories are seeded.
* Unit tests cover amount validation and category lookup.

### US-202: Manual Expense Creation

As a user, I want to manually create an expense so I can record spending without AI.

Acceptance Criteria:

* User can create an expense through API.
* Expense decreases account balance.
* Expense appears in transaction history.
* Invalid amount is rejected.
* Invalid category is rejected or mapped to `other` by explicit rule.
* Integration tests verify database persistence.

### US-203: Manual Income Creation

As a user, I want to manually create income so my balance can increase.

Acceptance Criteria:

* User can create income through API.
* Income increases account balance.
* Income appears in transaction history.
* Income category must be income type.
* Integration tests verify balance update.

### US-204: Transaction List and Filters

As a user, I want to list and filter transactions so I can review spending.

Acceptance Criteria:

* List supports month filter.
* List supports category filter.
* List supports type filter.
* List supports text search.
* Soft-deleted transactions are excluded by default.
* Tests cover pagination and filters.

### US-205: Dashboard Summary

As a user, I want monthly totals so I can understand my spending quickly.

Acceptance Criteria:

* Dashboard summary returns balance.
* Dashboard summary returns monthly income.
* Dashboard summary returns monthly expenses.
* Dashboard summary returns category breakdown.
* Values are computed from transaction records.
* Tests cover expense/income/category totals.

## Phase 3: Local AI Transaction Entry

Goal: Add local model parsing without sacrificing ledger safety.

Stories:

### US-301: LLM Provider Interface

As a developer, I want a provider interface so the app can support Ollama now and other local SLMs later.

Acceptance Criteria:

* Interface supports `parse_transaction_text`.
* Provider returns structured JSON only.
* Provider errors are normalized.
* Provider health status is available.
* Unit tests use fake provider.

### US-302: Ollama Provider Adapter

As a user, I want the app to use a local Ollama model so my spending text is parsed locally.

Acceptance Criteria:

* Ollama endpoint URL is configurable.
* Model name is configurable.
* Adapter sends JSON Schema format request.
* Adapter handles unavailable Ollama gracefully.
* Adapter timeout is configurable.
* Integration test can be skipped when Ollama is not installed.

### US-303: AI Parse Draft

As a user, I want the app to parse “Hôm nay tôi tiêu 35k vào ăn trưa” into a transaction draft.

Acceptance Criteria:

* API accepts raw chat message.
* API returns transaction draft.
* `35k` is normalized to `35000`.
* Category maps to `food`.
* Date maps to current local date.
* Draft does not mutate ledger.
* Tests cover Vietnamese shorthand amounts.

### US-304: Confirm AI Draft

As a user, I want to confirm an AI-parsed transaction before it changes my ledger when needed.

Acceptance Criteria:

* Valid draft can be confirmed.
* Confirmation creates transaction.
* Confirmation updates balance and dashboard totals.
* Draft cannot be confirmed twice.
* Expired draft cannot be confirmed.
* Tests cover duplicate confirmation prevention.

### US-305: Low Confidence Clarification

As a user, I want the assistant to ask questions when a spending message is ambiguous.

Acceptance Criteria:

* Missing amount triggers clarification.
* Missing category can map to `other` only if rule allows it.
* Ambiguous date triggers confirmation or clarification.
* Low confidence draft does not auto-create transaction.
* Tests cover invalid/ambiguous LLM outputs.

## Phase 4: Budgets and Dashboard UX

Goal: Make the product useful as a monthly expense manager.

Stories:

### US-401: Monthly Budget Setup

As a user, I want to set a monthly budget so I can track spending limits.

Acceptance Criteria:

* User can set total monthly budget.
* User can set category budget.
* Budget is currency-scoped.
* Invalid negative budget is rejected.
* Tests cover budget creation and updates.

### US-402: Category Remaining Budget

As a user, I want to see remaining budget by category.

Acceptance Criteria:

* API returns spent and remaining amount per category.
* Over-budget category is marked.
* Dashboard displays budget progress.
* Tests cover under-budget, exact-budget, and over-budget states.

### US-403: Recent Transactions UI

As a user, I want to see recent transactions after using chat entry.

Acceptance Criteria:

* New transaction appears without page refresh.
* Transaction shows amount, category, description, date.
* Expense is visually distinct from income.
* Empty state is displayed when no transactions exist.
* E2E test covers manual transaction creation.

### US-404: Chat-to-Ledger UI Flow

As a user, I want to type an expense into chat and see it recorded in the dashboard.

Acceptance Criteria:

* Chat input sends message to parse API.
* High-confidence draft can be recorded.
* Confirmation UI appears when needed.
* Dashboard totals update after confirmation.
* Transaction history updates after confirmation.
* E2E test covers “Hôm nay tôi tiêu 35k vào ăn trưa.”

## Phase 5: Chat Insights

Goal: Let users ask finance questions in natural language.

Stories:

### US-501: Query Spending Intent

As a user, I want to ask how much I spent in a category this month.

Acceptance Criteria:

* User can ask: “Tháng này tôi ăn uống hết bao nhiêu?”
* App maps query to category/date range.
* App answers using database totals, not LLM guesses.
* Answer includes amount and date range.
* Tests verify the answer is based on ledger records.

### US-502: Budget Remaining Intent

As a user, I want to ask how much budget remains.

Acceptance Criteria:

* User can ask: “Còn bao nhiêu tiền ăn tháng này?”
* App returns remaining food budget.
* App handles no budget configured.
* App does not fabricate budget data.
* Tests verify no-budget and budget-configured cases.

### US-503: Spending Breakdown Intent

As a user, I want to ask what category I spent the most on.

Acceptance Criteria:

* User can ask: “Tuần này tôi tiêu nhiều nhất vào mục nào?”
* App computes category totals from transactions.
* App returns top category and amount.
* Date range is explicit in response.
* Tests verify deterministic calculation.

## Phase 6: Data Management

Goal: Give users control over their local financial data.

Stories:

### US-601: Export Transactions

As a user, I want to export transactions so I can back up my data.

Acceptance Criteria:

* User can export CSV.
* User can export JSON.
* Export respects filters.
* Export is user-triggered only.
* Tests verify exported fields.

### US-602: Soft Delete Transaction

As a user, I want to delete mistakes without losing auditability.

Acceptance Criteria:

* Delete marks transaction as deleted.
* Deleted transaction no longer appears in default list.
* Dashboard totals exclude deleted transactions.
* Deleted transaction can be included with explicit admin/debug query.
* Tests verify balance recalculation.

### US-603: Clear AI History

As a privacy-conscious user, I want to clear AI parse history.

Acceptance Criteria:

* User can clear raw AI chat/parse attempts.
* Clearing AI history does not delete transactions.
* UI explains what is deleted.
* Tests verify only AI history is removed.

## 14. Validation Matrix Draft

Initial `docs/TEST_MATRIX.md` rows:

```markdown
| Story | Contract | Unit | Integration | E2E | Platform | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| US-101 | Backend health and settings | yes | yes | no | no | planned | none |
| US-201 | Money uses integer minor units | yes | no | no | no | planned | none |
| US-202 | Expense decreases balance | yes | yes | no | no | planned | none |
| US-205 | Dashboard totals computed from transactions | yes | yes | no | no | planned | none |
| US-301 | LLM provider returns structured drafts only | yes | no | no | no | planned | none |
| US-303 | “35k ăn trưa” parses into food expense draft | yes | yes | no | no | planned | none |
| US-304 | Confirmed AI draft creates transaction once | yes | yes | no | no | planned | none |
| US-404 | Chat-to-ledger UI records expense | no | yes | yes | no | planned | none |
| US-501 | Spending questions answer from DB totals | yes | yes | no | no | planned | none |
| US-601 | Export transactions | yes | yes | no | no | planned | none |
```

## 15. Architecture Decisions

### Decision 0001: Local-First Stack

Decision:

Use local-first architecture with SQLite for MVP, FastAPI backend, Next.js frontend, and local model provider.

Alternatives:

1. Cloud-first SaaS.
2. Mobile-only app.
3. Desktop-only app.
4. Fully frontend-only app with browser storage.

Consequences:

Positive:

* Easier privacy story.
* Simple local setup.
* Works without cloud LLM.
* Data ownership is clear.

Tradeoffs:

* Sync is deferred.
* Multi-device support is deferred.
* Packaging work may be needed later.

### Decision 0002: LLM Provider Abstraction

Decision:

Create `LlmProvider` interface and implement Ollama first.

Alternatives:

1. Direct Ollama calls inside controller.
2. Cloud provider first.
3. llama.cpp only.

Consequences:

Positive:

* Easy to swap Ollama, llama.cpp, or future SLM.
* Tests can use fake provider.
* Provider failure does not break domain logic.

Tradeoffs:

* Slightly more upfront design.
* Must maintain strict provider contract.

### Decision 0003: Ledger Mutation Safety

Decision:

AI output can create drafts only. Domain command handlers are the only code allowed to mutate financial records.

Alternatives:

1. Let AI call transaction creation directly.
2. Let frontend trust AI JSON.
3. Store AI output as transaction without validation.

Consequences:

Positive:

* Prevents hallucinated writes.
* Keeps finance math deterministic.
* Easier to test.
* Easier to audit.

Tradeoffs:

* More confirmation steps.
* Slightly slower chat flow.

## 16. Codex Execution Plan

### Step 0: Read Harness

Codex must read:

```text
README.md
AGENTS.md
docs/HARNESS.md
docs/FEATURE_INTAKE.md
docs/ARCHITECTURE.md
docs/CONTEXT_RULES.md
docs/TOOL_REGISTRY.md
docs/TEST_MATRIX.md
```

Then run:

```bash
scripts/bin/harness-cli query matrix
```

or on Windows:

```powershell
.\scripts\bin\harness-cli.exe query matrix
```

### Step 1: Create Product Docs

Codex task:

```text
Create docs/product/expense-ai/ from the provided SPEC. Split the product contract into PRODUCT_CONTRACT.md, DOMAIN_MODEL.md, LLM_CONTRACT.md, API_CONTRACT.md, PRIVACY_SECURITY.md, and UX_FLOWS.md. Do not implement code yet. Update docs/TEST_MATRIX.md with planned rows for the MVP stories. Create architecture decisions 0001-local-first-stack.md, 0002-llm-provider-abstraction.md, and 0003-ledger-mutation-safety.md using docs/templates/decision.md.
```

Validation:

```bash
git diff --check
```

### Step 2: Create Story Packets

Codex task:

```text
Create story packets under docs/stories/epics/ for E01 foundation, E02 ledger domain, E03 AI transaction entry, E04 budget dashboard, and E05 chat insights. Use docs/templates/story.md for normal stories and docs/templates/high-risk-story/ for high-risk stories. Do not implement app code yet.
```

Validation:

```bash
git diff --check
scripts/bin/harness-cli query matrix
```

### Step 3: Implement Phase 1

Codex task:

```text
Implement Phase 1 only: backend bootstrap, frontend bootstrap, and local database setup. Do not implement ledger domain or AI parsing yet. Keep the implementation aligned with docs/product/expense-ai and the story packets.
```

Validation:

```bash
pytest
ruff check .
black --check .
mypy .
npm run lint
npm run typecheck
npm test
```

Adjust commands to actual package layout.

## 17. Definition of Done

A story is done only when:

1. Product docs remain consistent.
2. Story acceptance criteria are satisfied.
3. Tests prove the behavior.
4. `docs/TEST_MATRIX.md` evidence is updated.
5. Any architecture decision change is recorded.
6. No LLM output can mutate financial state without validation.
7. User-facing flows are covered by either integration or E2E proof.

## 18. MVP Demo Script

Seed data:

```text
Opening balance: 1,000,000 VND
Monthly food budget: 2,000,000 VND
No existing transactions
```

Demo steps:

1. User opens dashboard.
2. Dashboard shows balance: 1,000,000 VND.
3. User types: “Hôm nay tôi tiêu 35k vào ăn trưa.”
4. App parses transaction draft:

   * expense
   * 35,000 VND
   * food
   * today
5. User confirms.
6. Dashboard updates:

   * balance: 965,000 VND
   * monthly expense: 35,000 VND
   * food spent: 35,000 VND
   * food remaining: 1,965,000 VND
7. User asks: “Tháng này tôi ăn uống hết bao nhiêu?”
8. Assistant answers from database:

   * “Tháng này bạn đã chi 35.000₫ cho Food.”

## 19. Open Questions

These can be decided later, but they should not block Phase 0 or Phase 1:

1. App should be web-only first or desktop-first?
2. Default local model should be which model?
3. Should the app support English and Vietnamese from day one?
4. Should account balance be manually set or derived from income/expense only?
5. Should deleted transactions be restorable in UI?
6. Should AI chat history be stored by default or off by default?
7. Should category mapping be user-customizable in MVP?

Recommended defaults:

1. Web-first, desktop later.
2. Ollama first.
3. Vietnamese + English parsing from day one.
4. Opening balance plus transaction deltas.
5. Soft delete now, restore UI later.
6. Store parse attempts for debugging, but provide clear history delete.
7. Built-in categories first, custom categories in Phase 4 or later.
