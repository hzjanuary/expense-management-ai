# Pocket Ledger AI Privacy And Security Contract

Source input: `docs/product/expense-ai/SPEC.md`

## Local-First Rules

- Financial data is stored locally by default.
- SQLite is the MVP persistence target.
- Local LLM provider is default.
- Cloud LLM providers are not enabled in MVP.
- Transaction data must not be sent to external providers unless a future cloud mode is explicitly enabled by the user.
- Export is user-triggered only.

## Provider Visibility

- The app must expose the active provider and model.
- Provider unavailability must be visible and graceful.
- Provider behavior must not bypass deterministic validation.

## Logging Limits

- Logs must not include full transaction descriptions by default.
- Logs should use request IDs for correlation.
- Application logs are operational records, not audit records.
- AI raw text may be stored in parse attempts for debugging, but logs should avoid duplicating it.

## AI History Deletion

- Users must be able to clear AI chat and parse history.
- Clearing AI history removes raw user text and parse attempts.
- Clearing AI history must not delete ledger transactions.
- If a parse attempt created a transaction, the ledger transaction remains and the historical parse metadata may be removed or anonymized according to the implementation story.
- AI transaction drafts store validated draft fields and raw user text locally for confirmation lifecycle.
- AI drafts are local SQLite records and are not sent to cloud providers in MVP.

## Soft Delete Behavior

- Transaction deletion is soft delete only in MVP.
- Deleted transactions are excluded from default transaction lists.
- Deleted transactions are excluded from dashboard totals.
- Deleted transactions may be available through an explicit admin/debug query if implemented.
- Balance and dashboard values must recalculate correctly after soft delete.

## MVP Data Controls

- Export transactions as CSV.
- Export transactions as JSON.
- Filter exports by the same supported transaction filters where practical.
- Clear AI history independently from ledger history.

## Security Non-Goals For MVP

- Multi-user authorization.
- Cloud synchronization.
- Cloud LLM credentials.
- Bank-link credentials.
- Native mobile secure enclave integration.
