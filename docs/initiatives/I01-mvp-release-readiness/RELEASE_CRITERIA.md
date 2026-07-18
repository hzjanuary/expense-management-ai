# I01 Release Criteria

## Backend Gates

- `cd backend && .venv/bin/pytest` passes.
- `cd backend && .venv/bin/ruff check .` passes.
- `cd backend && .venv/bin/black --check .` passes.
- `cd backend && .venv/bin/mypy app` passes.
- Backend health and any readiness endpoint return successful responses.
- Backend does not require Ollama for normal local release proof.

## Frontend Gates

- `cd frontend && npm run lint` passes.
- `cd frontend && npm run typecheck` passes.
- `cd frontend && npm run build` passes.
- Component or integration proof covers dashboard, budget, insight chat, data
  management, and error states once a frontend test runner exists.

## Full-Stack Startup Gates

- A single documented workflow starts backend and frontend locally.
- Alembic migrations are applied before backend readiness is claimed.
- SQLite data is stored in a controlled local path.
- Frontend API base URL points to the running backend.
- Startup docs include reset/seed guidance for deterministic demos.

## SQLite And Alembic Gates

- Alembic `upgrade head` passes on a fresh local SQLite database.
- Alembic `downgrade base` and re-upgrade pass for release validation.
- No release story may add unreviewed schema drift.

## E2E Gates

- Playwright or equivalent E2E runner is configured.
- `scripts/e2e-mvp.sh` passes from a clean isolated E2E database.
- For release signoff, run `scripts/e2e-mvp.sh` twice consecutively from a
  clean isolated state to check for state leakage.
- Normal E2E uses deterministic fake/local provider behavior and does not
  require real Ollama.
- E2E proves the complete flow in `DEMO_SCRIPT.md`.
- Optional real Ollama E2E is gated behind an explicit environment variable and
  skipped by default.

## Provider Gates

- Ollama-disabled mode displays a safe unavailable/degraded state where
  relevant.
- Existing fake provider path remains deterministic for tests and demos.
- Optional Ollama-enabled proof validates provider status and a parse smoke
  without making release dependent on a local model installation.

## Privacy And Security Gates

- Export remains user-triggered and uses the documented field allowlist.
- Clear AI history removes AI draft/history rows without deleting ledger
  transactions.
- Soft-deleted transactions remain hidden from default user-facing reads.
- Logs do not include raw financial chat text or full transaction descriptions
  by default.
- No cloud provider, upload, sync, or telemetry behavior is introduced.

## Accessibility Gates

- Keyboard navigation smoke check covers dashboard, chat input, budget setup,
  export, delete confirmation, and clear-history confirmation.
- Visible focus states are present for interactive controls.
- Form errors are visible and associated with relevant inputs.
- Color alone is not the only signal for income, expense, or over-budget state.

## Dependency And Security Review Gates

- Backend and frontend dependency audit output is reviewed.
- Findings are triaged rather than blindly forcing upgrades.
- Any dependency change is scoped to a release-hardening story and validated.

## Git And Documentation Gates

- `git diff --check` passes.
- `git status` is clean or contains only reviewed release artifacts before
  release signoff.
- README and troubleshooting docs explain local setup, reset, seed, validation,
  and Ollama optionality.
- An MVP release validation report is produced by US-707.
