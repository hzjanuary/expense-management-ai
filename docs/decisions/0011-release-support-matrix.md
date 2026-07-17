# 0011 Release Support Matrix

Date: 2026-07-17

## Status

Proposed

## Context

Release readiness needs a bounded local support target. The repo currently runs
on Linux in this workspace, uses Python/FastAPI, Node/Next.js, SQLite, and an
optional local model provider. Without a support matrix, E2E and setup docs can
overpromise platform coverage.

## Decision

Propose that US-707 define an MVP local support matrix covering:

- supported operating systems for local development/demo,
- required Python and Node versions,
- supported package managers,
- SQLite/Alembic expectations,
- browser target for Playwright proof,
- Ollama optionality and skip behavior,
- unsupported production/cloud deployment surfaces.

The support matrix should describe what was actually validated rather than
claiming broad compatibility.

## Alternatives Considered

1. Document only the current Linux validation environment.
2. Claim generic macOS/Linux/Windows support without proof.
3. Defer support documentation until after deployment work.

## Consequences

Positive:

- Prevents release docs from overclaiming platform support.
- Gives US-707 objective documentation criteria.
- Separates local MVP support from future packaging or deployment work.

Tradeoffs:

- Some platforms may remain unverified for MVP.
- More setup documentation is required before release signoff.

## Follow-Up

- US-707 should accept, refine, or supersede this proposal based on actual
  validation results.

