# US-707 Release Hardening And Documentation

## Status

implemented

## Lane

high-risk

## Product Contract

Run complete quality gates, review release risks, document local setup and
troubleshooting, and produce an MVP release validation report.

## Relevant Product Docs

- `docs/product/expense-ai/PRODUCT_CONTRACT.md`
- `docs/product/expense-ai/PRIVACY_SECURITY.md`
- `docs/initiatives/I01-mvp-release-readiness/RELEASE_CRITERIA.md`
- `docs/initiatives/I01-mvp-release-readiness/DEMO_SCRIPT.md`

## Dependencies

- Successful US-706 validation.
- All E07 implementation stories.
- All original MVP backend and frontend stories.

## Acceptance Criteria

- Complete backend quality gates pass.
- Complete frontend quality gates pass.
- Alembic base-to-head validation passes.
- E2E suite passes.
- Dependency audit findings are reviewed and documented.
- Privacy-safe logging is verified.
- Accessibility smoke checks are completed.
- Release setup documentation is added.
- Troubleshooting documentation is added.
- Supported local environments are documented.
- MVP release validation report is produced.
- No unrelated product features are introduced.

## Design Notes

- Commands: backend validation, frontend validation, Alembic validation, E2E,
  dependency audit, accessibility smoke.
- Queries: Harness matrix/stats, Git status, release evidence collection.
- API: no new API behavior expected.
- Tables: no migration expected unless prior stories introduced one.
- Domain rules: verify ledger mutation safety and privacy guarantees still hold.
- UI surfaces: release docs and validation report.

## Explicit Out Of Scope

- New product behavior.
- Forced dependency upgrades without triage.
- Cloud deployment.
- Auth.
- Packaging.
- Major redesign.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Backend and frontend test gates pass where configured. |
| Integration | Backend/frontend/API integration gates pass. |
| E2E | Full E2E suite passes. |
| Platform | Local startup, browser smoke, accessibility smoke, and supported environment docs. |
| Release | MVP release validation report and troubleshooting docs. |

## Harness Delta

Closes I01 by adding release validation evidence and any follow-up backlog items
for deferred post-MVP risks.

## Evidence

Implemented artifacts:

- `scripts/release-validate.sh` coordinates release gates from the repository
  root.
- `scripts/privacy-log-smoke.sh` checks controlled Compose runtime logs for
  raw AI chat text, transaction descriptions, and provider/draft payload text.
- `frontend/e2e/mvp-demo.spec.ts` now includes axe-powered accessibility smoke
  checks for the dashboard, budget setup form, AI draft review, insight result,
  transaction delete dialog, and clear AI history dialog.
- `docs/RELEASE.md` documents the local release path.
- `docs/TROUBLESHOOTING.md` documents common runtime and validation failures.
- `docs/KNOWN_LIMITATIONS.md` records validated scope and remaining risks.
- `docs/releases/MVP_RELEASE_VALIDATION.md` records the factual release
  validation report.
- `CHANGELOG.md` records the MVP release-candidate summary.
- Decision `0011-release-support-matrix` is accepted with the validated
  support target.

Validation completed on 2026-07-18:

- `scripts/release-validate.sh`: passed.
- Backend quality inside release validation: `pytest` passed
  (`241 passed, 1 skipped, 1 warning`), `ruff check .` passed,
  `black --check .` passed, and `mypy app` passed.
- Isolated Alembic validation: `upgrade head`, `current`, `downgrade base`,
  `upgrade head`, `current` passed with final revision `0004 (head)`.
- Frontend quality inside release validation: `npm ci`, `npm test`
  (`9 files`, `49 tests`), `npm run lint`, `npm run typecheck`, and
  `npm run build` passed.
- Dependency review completed: npm audit reported two moderate findings for
  `next`/nested `postcss`; backend pip-audit reported local development
  `.venv` `pip 26.0.1` findings. Findings are documented and accepted
  temporarily in the release report and known limitations.
- Playwright E2E passed twice from clean isolated state. Each run reported
  `1 passed`.
- Accessibility smoke passed with no critical or serious axe violations.
- Default Compose runtime smoke passed through `scripts/runtime-smoke.sh`,
  including backend/frontend health, transaction proxy, Alembic current,
  SQLite file presence, and persistence across restart.
- Privacy-log smoke passed through `scripts/privacy-log-smoke.sh`.
- `git diff --check` passed.
- `scripts/bin/harness-cli query matrix` passed.
- `scripts/bin/harness-cli query stats` passed.

Release recommendation:

- Ready with documented limitations for the validated local Linux Docker MVP
  environment.
