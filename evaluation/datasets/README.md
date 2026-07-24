# Evaluation Datasets

This directory contains offline benchmark datasets for Pocket Ledger AI
research. Datasets are versioned, synthetic or reviewed-template based, and must
not include real user financial data.

## Seed Dataset

```text
vi_finance_benchmark_v1_seed.jsonl
```

Record count: 120.

Split distribution:

- Train: 72.
- Dev: 24.
- Test: 24.

Checksum:

```text
abb6459579dc54865bf0024088f5dd8f8840b83e449236202502929b62d4b96a
```

## Validate

```bash
cd backend
.venv/bin/python -m app.evaluation.cli validate \
  ../evaluation/datasets/vi_finance_benchmark_v1_seed.jsonl \
  --strict
```

Optional JSON summary:

```bash
cd backend
.venv/bin/python -m app.evaluation.cli validate \
  ../evaluation/datasets/vi_finance_benchmark_v1_seed.jsonl \
  --strict \
  --json-output /tmp/pocket-ledger-benchmark-summary.json
```

## Privacy Rules

Do not add:

- real names;
- account or card numbers;
- phone numbers;
- emails;
- real addresses;
- real financial histories;
- copied private chat logs.

The validator includes practical pattern checks for emails, Vietnamese phone
numbers, and long account/card-like digit sequences. Human review remains
required for semantic privacy issues.

