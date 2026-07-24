# Vietnamese Financial-Language Evaluation Methodology

## Purpose

This methodology defines how Pocket Ledger AI will be evaluated for Vietnamese
personal-finance language understanding. Sprint 1 creates the benchmark
contract and seed dataset only. It does not run model comparisons or benchmark
inference.

## Research Questions

**RQ1:** Does the hybrid LLM plus deterministic recovery architecture improve
intent and slot accuracy compared with LLM-only and rule-only systems?

**RQ2:** Does deterministic recovery reduce false transaction drafts without
increasing unsafe classification?

**RQ3:** What are the latency and memory trade-offs of supported local models?

**RQ4:** Does explicit confirmation preserve zero ledger mutation before user
approval?

## System Under Evaluation

The implemented application uses:

- Local-first SQLite persistence.
- FastAPI application services for deterministic ledger commands and queries.
- A typed LLM provider boundary.
- Optional local Ollama with structured JSON output.
- Deterministic recovery for supported Vietnamese money, category, date, and
  spending-query patterns.
- Explicit confirmation before AI-created drafts mutate the ledger.

Benchmark execution in later sprints must evaluate parser/classifier outputs
without calling transaction confirmation, draft cancellation, budget mutation,
or database session factories.

## Benchmark Unit

Each record is one Vietnamese user utterance with expected typed fields:

- intent;
- transaction type, amount, currency, category, description, and date label for
  transaction drafts;
- date-range and category expectations for read-only insight intents;
- clarification expectations for incomplete, unsupported, ambiguous, or unsafe
  utterances.

The seed dataset is synthetic or based on reviewed generic templates. It
contains no real user financial data.

## Evaluation Dimensions For Future Sprints

- Intent accuracy.
- Slot accuracy by field.
- Draft safety precision and recall.
- Clarification quality for ambiguous inputs.
- Category normalization accuracy.
- Money normalization accuracy.
- Date/date-range normalization accuracy.
- Read-only classification safety.
- Latency and memory by local model.
- Ledger mutation safety before confirmation.

## Baselines Planned For Later Sprints

- **LLM-only:** provider structured output without deterministic recovery.
- **Rule-only:** deterministic signals without provider output.
- **Hybrid:** provider structured output plus deterministic recovery and
  validation, matching the application architecture.

These baselines are not implemented in Sprint 1.

## Checksum Method

The dataset checksum is deterministic:

1. Load and validate every JSONL record with strict Pydantic models.
2. Sort records lexicographically by stable `id`.
3. Serialize each model in Pydantic `json` mode with sorted keys, UTF-8 text
   preserved, and compact JSON separators.
4. Join serialized records with `\n`.
5. Compute SHA-256 over the UTF-8 bytes.

The Sprint 1 seed checksum is:

```text
abb6459579dc54865bf0024088f5dd8f8840b83e449236202502929b62d4b96a
```

## Leakage Prevention

Dataset splits target roughly 60% train, 20% dev, and 20% test. Semantic
families are distributed deliberately; future benchmark training or prompt
tuning must not copy exact templates from dev/test into train. Exact duplicate
text within a split is rejected unless explicitly marked in notes.

## Mutation Safety

Sprint 1 validation is file-only. The evaluation package does not import:

- database models or session factories;
- transaction creation/confirmation/cancellation commands;
- budget mutation commands;
- API route modules.

An architectural test scans `backend/app/evaluation/` for forbidden imports, and
an integration test validates the seed dataset while proving transaction count,
AI draft count, account balance, and budget rows remain unchanged in an
isolated database fixture.

