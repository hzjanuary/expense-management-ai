# Pocket Ledger AI Product Contract

Source input: `docs/product/expense-ai/SPEC.md`

## Intake

- Input type: New spec.
- Initial risk lane: high-risk.
- Reason: the product touches financial records, local data storage, AI provider behavior, ledger mutation safety, privacy, and public API contracts.

## One-Line Contract

Users can chat naturally with a local AI assistant to record expenses, income, transfers, budgets, and spending queries. The system converts natural language into validated financial records and updates monthly/category totals only after deterministic validation and user confirmation when needed.

## MVP Scope

- Local-first web application for personal expense management.
- Manual expense and income creation.
- Local SQLite persistence for accounts, categories, transactions, budgets, chat messages, and AI parse attempts.
- Integer minor-unit money handling with VND as the MVP default currency.
- Monthly category budgets and dashboard totals.
- Local LLM/SLM parsing through a provider abstraction, with Ollama as the first provider.
- Chat entry for transaction drafts and spending queries.
- Deterministic validation before any ledger mutation.
- AI-created drafts that require confirmation when confidence or fields are ambiguous.
- CSV/JSON export, soft delete, and AI history clearing.

## Non-MVP Scope

- Bank sync.
- Cloud account sync.
- Cloud LLM providers.
- Multi-user household finance.
- Investment portfolio tracking.
- Tax reports.
- Receipt OCR.
- Voice input.
- Native mobile app.
- Local model fine-tuning.
- Automatic transaction creation without deterministic validation.

## User Goals

- Record daily spending quickly without opening a large form.
- Keep financial data local by default.
- Use Vietnamese shorthand such as `35k`, `35 nghìn`, `35 ngàn`, `1tr`, `1 triệu`, and `1m`.
- See current balance, monthly income, monthly expense, category spending, and remaining budgets.
- Ask spending questions such as `Thang nay toi an uong het bao nhieu?`.
- Export or clear local data under explicit user control.

## Product Guarantees

- LLM output never writes directly to the database.
- Financial mutations happen only through deterministic command handlers.
- Money is stored as integer minor units, never floats.
- Transaction amounts are positive.
- MVP transaction currency must match the account currency.
- Soft-deleted transactions are excluded from default lists and dashboard totals.
- Dashboard and insight answers are computed from ledger records, not LLM guesses.
- Cloud providers are disabled in MVP.
- Logs do not include full transaction descriptions by default.
- Users can see the active AI provider/model status.

## Canonical Example

User:

```text
Hôm nay tôi tiêu 35k vào ăn trưa.
```

Expected parsed draft:

```json
{
  "intent": "create_transaction",
  "transaction_type": "expense",
  "amount_minor": 35000,
  "currency": "VND",
  "category_slug": "food",
  "description": "ăn trưa",
  "occurred_at_text": "hôm nay",
  "confidence": "high"
}
```

After confirmation:

- Total available balance decreases by `35000` VND.
- Monthly food spending increases by `35000` VND.
- Monthly total expense increases by `35000` VND.
- The transaction appears in history and dashboard summaries.

## Definition Of Done

A story is done only when:

- Product docs remain consistent with the accepted behavior.
- Story acceptance criteria are satisfied.
- Tests or validation evidence prove the behavior.
- `docs/TEST_MATRIX.md` evidence is updated.
- Any meaningful architecture decision change is recorded.
- No LLM output can mutate financial state without validation.
- User-facing flows are covered by integration or E2E proof as appropriate.

## Living Product Docs

- Domain model: `docs/product/expense-ai/DOMAIN_MODEL.md`
- LLM contract: `docs/product/expense-ai/LLM_CONTRACT.md`
- API contract: `docs/product/expense-ai/API_CONTRACT.md`
- Privacy/security: `docs/product/expense-ai/PRIVACY_SECURITY.md`
- UX flows: `docs/product/expense-ai/UX_FLOWS.md`
