# TASK-THESIS-001: Vietnamese Financial Language Benchmark Contracts And Seed Dataset

Status: implemented pending review

Branch: `feat/thesis-ai-evaluation`

## Objective

Create the first reproducible research foundation for evaluating Pocket
Ledger's Vietnamese financial-language AI. Sprint 1 defines the benchmark
contract, seed dataset, validation tooling, and thesis methodology. It does not
run model comparison or full benchmark execution.

## Scope Delivered

- Added a strict evaluation-only Pydantic contract under `backend/app/evaluation/`.
- Added a deterministic JSONL dataset loader and validator.
- Added a CLI validation command.
- Added JSON Schema documentation for benchmark records.
- Added a 120-record synthetic/reviewed-template seed dataset.
- Added backend tests for validation failures, checksum stability, CLI behavior,
  privacy guards, forbidden imports, and no ledger mutation.
- Added thesis methodology, experiment plan, dataset card, and dataset README.
- Replaced stale architecture scaffold language with the implemented
  Next.js/FastAPI/SQLite/Ollama architecture and evaluation boundary.

## Dataset Evidence

Validation command:

```bash
cd backend
.venv/bin/python -m app.evaluation.cli validate \
  ../evaluation/datasets/vi_finance_benchmark_v1_seed.jsonl \
  --strict
```

Result:

```text
validation_status: VALID
schema_version: vi-finance-benchmark-v1
record_count: 120
split_counts: {"dev": 24, "test": 24, "train": 72}
intent_counts: {"budget_remaining": 9, "create_transaction": 68, "query_spending": 22, "spending_breakdown": 10, "unknown": 11}
duplicate_status: ok
dataset_checksum: abb6459579dc54865bf0024088f5dd8f8840b83e449236202502929b62d4b96a
```

## Research Questions Documented

- RQ1: Hybrid LLM plus deterministic recovery versus LLM-only and rule-only
  intent/slot accuracy.
- RQ2: Deterministic recovery impact on false transaction drafts and unsafe
  classification.
- RQ3: Latency and memory trade-offs for supported local models.
- RQ4: Explicit confirmation and zero ledger mutation before user approval.

## Safety Boundary

The evaluation package is intentionally independent from production API,
database, and mutation code. Sprint 1 validation does not import or call:

- transaction creation commands;
- AI draft confirmation/cancellation commands;
- budget mutation commands;
- database session factories;
- API route modules.

Architectural tests scan the package for forbidden imports. A database-backed
test validates the dataset while proving transaction count, draft count, account
balance, and budget rows remain unchanged.

## Privacy And Provenance

All dataset records are synthetic or reviewed generic templates. The validator
rejects practical personal-data patterns such as emails, Vietnamese phone
numbers, and long account/card-like numeric sequences. Human review remains
required before expanding the dataset.

## Validation Status

Focused evaluation tests:

```text
20 passed, 1 warning
```

Full backend gate:

```text
pytest: 333 passed, 1 skipped, 1 warning
ruff check .: passed
black --check .: passed
mypy app: passed
```

## Remaining Limitations

- The seed dataset is small and synthetic; it is not a representative Vietnamese
  finance corpus.
- Model execution, scoring, latency, and memory measurement are intentionally
  deferred to later thesis sprints.
- Regional dialect coverage is limited.
- Duplicate semantic-template leakage is documented but not fully automated
  beyond exact duplicate text checks.
