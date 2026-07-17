# US-707 Release Hardening And Documentation

## Status

planned

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

TBD.

