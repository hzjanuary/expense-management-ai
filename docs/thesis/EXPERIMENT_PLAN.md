# Vietnamese Financial-Language Experiment Plan

## Sprint 1 Scope

Implemented in Sprint 1:

- Benchmark sample contract.
- Strict JSONL validation.
- Deterministic dataset checksum.
- Seed dataset with 120 synthetic/reviewed-template records.
- CLI validation command.
- Privacy and mutation-safety tests.
- Architecture documentation for the evaluation boundary.

Not implemented in Sprint 1:

- Model comparison.
- Real Ollama benchmark execution.
- Prompt sweeps.
- Latency/memory measurement harness.
- Statistical reporting.

## Planned Evaluation Pipeline

Future benchmark execution should follow this non-mutating flow:

```text
dataset record
  -> selected evaluator adapter
  -> typed predicted record/output
  -> deterministic scorer
  -> aggregate metrics
  -> report artifacts
```

The evaluator must not call ledger mutation commands or write to the production
SQLite database.

## Candidate Systems

- Rule-only classifier/recovery.
- LLM-only structured extraction.
- Hybrid provider plus deterministic recovery.
- Optional local model variants, including the configured
  `qwen3:4b-instruct`, when available.

## Metrics

- Intent exact match.
- Transaction draft decision accuracy.
- False draft rate for questions, hypotheticals, balances, and adversarial
  text.
- Slot exact match: transaction type, amount, currency, category, description,
  date label, and date-range label.
- Category alias accuracy.
- Clarification reason accuracy.
- Latency p50/p95.
- Peak memory where measurable.
- Pre-confirm ledger mutation count.

## Data Splits

Sprint 1 seed distribution:

- Train: 72 records.
- Dev: 24 records.
- Test: 24 records.

Train data may be used for prompt and rule development. Dev data may be used for
iteration and threshold tuning. Test data must be held for final evaluation.

## Reproducible Validation Command

```bash
cd backend
.venv/bin/python -m app.evaluation.cli validate \
  ../evaluation/datasets/vi_finance_benchmark_v1_seed.jsonl \
  --strict
```

The command prints record counts, split counts, intent counts, tag counts,
duplicate status, schema version, validation status, and dataset checksum.

## Future Report Requirements

A benchmark report should include:

- commit and dataset checksum;
- evaluator configuration;
- model/provider settings where applicable;
- deterministic scorer version;
- per-intent and per-slot metrics;
- unsafe draft examples;
- clarification failures;
- latency/memory measurements;
- limitations and excluded cases.

