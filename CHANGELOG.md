# Changelog

## MVP Release Candidate - 2026-07-18

- Added local-first ledger backend with manual expense and income creation,
  transaction filters, dashboard summary, monthly budgets, category remaining
  budget, export, soft delete, and clear AI history.
- Added AI-assisted transaction draft parsing with explicit confirmation and
  safe clarification behavior.
- Added DB-grounded spending, budget remaining, and top-category insight
  endpoints and UI.
- Added Next.js dashboard with live summary, budget setup/progress, recent
  transactions, chat-to-ledger, insights, export, soft-delete, and AI-history
  controls.
- Added Docker Compose local runtime with persistent SQLite storage and optional
  Ollama.
- Added isolated Playwright E2E MVP demo using deterministic fake-provider
  behavior.
- Added release validation command, accessibility smoke, privacy-log smoke,
  troubleshooting docs, known limitations, and MVP validation report.

This release candidate is a local single-user MVP. It does not claim cloud
production readiness, authentication, multi-user support, or hosted deployment.
