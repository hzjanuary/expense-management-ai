# I01 Scope

## Frontend And Backend Integration Gaps

- Dashboard summary cards are still not fully backed by live
  `GET /api/v1/dashboard/summary` data.
- Budget setup and budget remaining data are not yet exposed as an editable,
  user-facing frontend workflow.
- Insight query endpoints exist, but the frontend chat surface only covers
  transaction parse/confirm.
- Export, soft delete, and clear AI history endpoints exist, but have no
  frontend user-triggered controls.
- Refresh coordination across dashboard totals, budget remaining, recent
  transactions, insights, exports, and deletion needs a consistent frontend
  pattern.

## Runtime And Configuration Gaps

- Backend and frontend can run separately, but there is no single documented
  full-stack startup workflow.
- Alembic migration application is not yet part of an end-to-end local startup
  readiness path.
- The controlled local SQLite data path for demos and E2E proof needs to be
  explicit.
- Frontend/backend URL configuration needs one documented local convention.
- Ollama-disabled behavior is implemented but not yet part of full-stack
  release proof.
- Optional Ollama-enabled proof is not yet defined as a gated workflow.

## Missing User-Facing MVP Surfaces

- Live dashboard totals and selected-month state.
- Budget setup/editing and category progress UI.
- Insight chat UI for spending, budget remaining, and spending breakdown.
- Export controls for CSV and JSON.
- Soft-delete UI with explicit confirmation and post-delete refresh.
- Clear-AI-history privacy action with explicit user explanation.

## Missing E2E And Platform Proof

- No Playwright or equivalent full-stack E2E suite exists yet.
- No deterministic seed/reset workflow exists for the MVP demo scenario.
- No release validation report template exists for final local signoff.
- Accessibility proof is limited to code review and build success.
- Runtime logs have not been checked end-to-end for privacy-safe output.

## Privacy, Security, And Reliability Boundaries

In scope:

- Verify local-only storage and local provider behavior.
- Verify clear AI history removes draft/history data without deleting ledger
  records.
- Verify exports use the established field allowlist and remain user-triggered.
- Verify logs do not include raw financial text or full transaction
  descriptions by default.
- Verify soft delete and AI confirmation still use deterministic backend
  mutation paths.

Out of scope:

- Authentication, authorization, and roles.
- Cloud deletion or cloud backup.
- Encrypted local storage.
- Audit-log infrastructure.
- Background jobs or retention schedules.

## Release Scope Versus Post-MVP Scope

Release scope is a local web MVP that proves the end-to-end finance workflow
with local SQLite, FastAPI, Next.js, and optional local model integration.

Post-MVP scope includes packaging, sync, auth, custom categories, account
management UI, mobile/desktop distribution, restore flows, hard delete,
multi-turn chat memory, cloud providers, and production hosting.

