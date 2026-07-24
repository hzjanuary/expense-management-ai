# Dataset Card: `vi_finance_benchmark_v1_seed`

## Summary

`vi_finance_benchmark_v1_seed` is a synthetic Vietnamese
financial-language benchmark seed for Pocket Ledger AI. It contains 120 records
covering everyday expense/income statements, colloquial Vietnamese, money
formats, analytical spending questions, budget questions, breakdown questions,
unsupported requests, and adversarial prompt-injection-like text.

## Status

Seed dataset for thesis evaluation Sprint 1. It is suitable for validator and
methodology development, not for final model benchmarking by itself.

## Location

```text
evaluation/datasets/vi_finance_benchmark_v1_seed.jsonl
```

Schema:

```text
evaluation/schemas/benchmark.schema.json
```

## Provenance

All records are synthetic or based on reviewed generic templates. The dataset
does not include real user financial data, private chat logs, names, account
numbers, card numbers, phone numbers, addresses, emails, or real financial
histories.

## Record Count And Splits

- Total: 120.
- Train: 72.
- Dev: 24.
- Test: 24.

## Intent Distribution

- `create_transaction`: 68.
- `query_spending`: 22.
- `budget_remaining`: 9.
- `spending_breakdown`: 10.
- `unknown`: 11.

## Coverage

The seed includes:

- clear expense statements;
- clear income statements;
- colloquial Vietnamese (`tao`, `tui`, `mình`, `làm tô`, `quất ly`, `hết`,
  `mất`);
- Vietnamese without diacritics;
- common typo/no-diacritic patterns;
- mixed Vietnamese and English;
- money forms such as `28k`, `28 nghìn`, `28 ngàn`, `28.000`, `1tr`,
  `1 triệu`, and `1,5 triệu`;
- time-versus-money ambiguity;
- quantity-versus-money ambiguity;
- multiple amount ambiguity;
- total spending questions;
- category spending questions;
- budget remaining questions;
- weekly and monthly top-category questions;
- price questions that must not create drafts;
- balance statements;
- hypothetical statements;
- unsupported date ranges;
- unknown/general requests;
- prompt-injection-like text.

## Controlled Tags

Allowed tags are:

```text
clear
colloquial
no_diacritics
typo
mixed_language
expense
income
total_query
category_query
budget_query
breakdown_query
ambiguous_amount
quantity_ambiguity
time_ambiguity
hypothetical
price_question
unsupported
adversarial
clarification_required
```

## Validation

Run:

```bash
cd backend
.venv/bin/python -m app.evaluation.cli validate \
  ../evaluation/datasets/vi_finance_benchmark_v1_seed.jsonl \
  --strict
```

Validated checksum:

```text
abb6459579dc54865bf0024088f5dd8f8840b83e449236202502929b62d4b96a
```

## Intended Use

- Develop reproducible Vietnamese financial-language evaluation.
- Validate benchmark schemas and loading code.
- Support future parser/classifier comparisons.
- Test safety constraints around transaction draft creation and clarification.

## Prohibited Use

- Training or evaluating systems as if this were real user data.
- Inferring real spending behavior or demographics.
- Using the dataset to bypass explicit confirmation or ledger safety rules.
- Treating synthetic coverage as complete Vietnamese language coverage.

## Known Limitations

- Synthetic phrasing may underrepresent regional Vietnamese usage.
- The seed is small and not statistically representative.
- It focuses on currently supported Pocket Ledger intents.
- It does not include real model output, latency, or memory measurements.
- It does not cover long multi-turn conversations or persistent chat history.

## Bias And Ethics Notes

The dataset uses everyday Vietnamese finance phrases and common local spending
categories. It may underrepresent dialects, code-switching patterns, disability
access needs, and household finance contexts. Future expansion should include a
broader review process while preserving the no-real-user-data rule.

