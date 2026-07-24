from __future__ import annotations

import asyncio
import json
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import BudgetPeriodModel, CategoryBudgetModel
from app.evaluation.dataset import DatasetLoadError, load_jsonl_records
from app.evaluation.schemas import (
    CANONICAL_CATEGORIES,
    CONTROLLED_TAGS,
    BenchmarkIntent,
    DatasetSplit,
)
from app.evaluation.validation import compute_dataset_checksum, validate_dataset

from ..conftest import (
    count_ai_transaction_drafts,
    count_transactions,
    fetch_account,
    seed_cash_account,
)

DATASET_PATH = (
    Path(__file__).resolve().parents[3]
    / "evaluation"
    / "datasets"
    / "vi_finance_benchmark_v1_seed.jsonl"
)
SCHEMA_PATH = (
    Path(__file__).resolve().parents[3]
    / "evaluation"
    / "schemas"
    / "benchmark.schema.json"
)


def write_jsonl(path: Path, rows: list[dict[str, object]]) -> None:
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )


def valid_row(**overrides: object) -> dict[str, object]:
    row: dict[str, object] = {
        "id": "sample-001",
        "text": "hôm nay ăn phở 45k",
        "locale": "vi-VN",
        "intent": "create_transaction",
        "transaction_type": "expense",
        "amount_minor": 45_000,
        "currency": "VND",
        "category_slug": "food",
        "description": "Phở",
        "date_label": "today",
        "date_range_label": None,
        "should_create_draft": True,
        "needs_clarification": False,
        "clarification_reason": None,
        "tags": ["clear", "expense"],
        "split": "train",
        "source": "synthetic",
    }
    row.update(overrides)
    return row


def test_valid_dataset_loads() -> None:
    records = load_jsonl_records(DATASET_PATH)

    assert len(records) == 120
    assert {record.split for record in records} == {
        DatasetSplit.TRAIN,
        DatasetSplit.DEV,
        DatasetSplit.TEST,
    }


def test_malformed_json_fails(tmp_path: Path) -> None:
    dataset = tmp_path / "bad.jsonl"
    dataset.write_text('{"id": "broken"\n', encoding="utf-8")

    try:
        load_jsonl_records(dataset)
    except DatasetLoadError as error:
        assert "malformed JSON" in str(error)
    else:  # pragma: no cover
        raise AssertionError("malformed JSON should fail")


def test_duplicate_id_fails(tmp_path: Path) -> None:
    dataset = tmp_path / "duplicate-id.jsonl"
    write_jsonl(
        dataset,
        [
            valid_row(id="same"),
            valid_row(id="same", text="hôm nay mua cà phê 25k", category_slug="coffee"),
        ],
    )

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert any("duplicate id" in error for error in summary.errors)


def test_duplicate_text_within_split_fails(tmp_path: Path) -> None:
    dataset = tmp_path / "duplicate-text.jsonl"
    write_jsonl(
        dataset,
        [
            valid_row(id="sample-001"),
            valid_row(id="sample-002"),
        ],
    )

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert any("duplicate text" in error for error in summary.errors)


def test_invalid_intent_fails(tmp_path: Path) -> None:
    dataset = tmp_path / "invalid-intent.jsonl"
    write_jsonl(dataset, [valid_row(intent="set_budget")])

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert "intent" in summary.errors[0]


def test_invalid_category_fails(tmp_path: Path) -> None:
    dataset = tmp_path / "invalid-category.jsonl"
    write_jsonl(dataset, [valid_row(category_slug="groceries")])

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert "category_slug" in summary.errors[0]


def test_invalid_tag_fails(tmp_path: Path) -> None:
    dataset = tmp_path / "invalid-tag.jsonl"
    write_jsonl(dataset, [valid_row(tags=["clear", "private"])])

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert "unsupported tag" in summary.errors[0]


def test_invalid_split_fails(tmp_path: Path) -> None:
    dataset = tmp_path / "invalid-split.jsonl"
    write_jsonl(dataset, [valid_row(split="holdout")])

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert "split" in summary.errors[0]


def test_transaction_draft_requires_amount_type_and_category(tmp_path: Path) -> None:
    dataset = tmp_path / "invalid-draft.jsonl"
    write_jsonl(dataset, [valid_row(amount_minor=None)])

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert "amount_minor is required for a draft" in summary.errors[0]


def test_analytical_intents_cannot_create_drafts(tmp_path: Path) -> None:
    dataset = tmp_path / "invalid-analytical.jsonl"
    write_jsonl(
        dataset,
        [
            valid_row(
                intent="query_spending",
                transaction_type=None,
                amount_minor=35_000,
                currency="VND",
                category_slug=None,
                description=None,
                date_label=None,
                date_range_label="this_month",
                tags=["total_query"],
            )
        ],
    )

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert "only create_transaction can create a draft" in summary.errors[0]


def test_clarification_consistency(tmp_path: Path) -> None:
    dataset = tmp_path / "invalid-clarification.jsonl"
    write_jsonl(
        dataset,
        [
            valid_row(
                amount_minor=None,
                should_create_draft=False,
                needs_clarification=True,
            )
        ],
    )

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert "clarification_reason is required" in summary.errors[0]


def test_deterministic_checksum() -> None:
    records = load_jsonl_records(DATASET_PATH)
    reversed_records = list(reversed(records))

    assert compute_dataset_checksum(records) == compute_dataset_checksum(
        reversed_records
    )
    assert (
        compute_dataset_checksum(records)
        == "abb6459579dc54865bf0024088f5dd8f8840b83e449236202502929b62d4b96a"
    )


def test_stable_summary_counts() -> None:
    summary = validate_dataset(DATASET_PATH, strict=True)

    assert summary.valid
    assert summary.record_count == 120
    assert summary.split_counts == {"dev": 24, "test": 24, "train": 72}
    assert summary.intent_counts == {
        "budget_remaining": 9,
        "create_transaction": 68,
        "query_spending": 22,
        "spending_breakdown": 10,
        "unknown": 11,
    }


def test_personal_data_pattern_guard(tmp_path: Path) -> None:
    dataset = tmp_path / "personal-data.jsonl"
    write_jsonl(dataset, [valid_row(text="chuyển tiền đến test@example.com 45k")])

    summary = validate_dataset(dataset)

    assert not summary.valid
    assert any("possible personal data" in error for error in summary.errors)


def test_schema_file_matches_pydantic_enums_where_practical() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    assert set(schema["properties"]["intent"]["enum"]) == {
        intent.value for intent in BenchmarkIntent
    }
    assert set(schema["properties"]["category_slug"]["enum"]) == {
        *CANONICAL_CATEGORIES,
        None,
    }
    assert set(schema["properties"]["tags"]["items"]["enum"]) == CONTROLLED_TAGS


def test_validation_has_no_ledger_mutation(
    transaction_api_client: tuple[object, async_sessionmaker[AsyncSession]],
) -> None:
    _, session_factory = transaction_api_client
    asyncio.run(seed_cash_account(session_factory, balance_minor=1_000_000))

    before = asyncio.run(_ledger_snapshot(session_factory))
    summary = validate_dataset(DATASET_PATH, strict=True)
    after = asyncio.run(_ledger_snapshot(session_factory))

    assert summary.valid
    assert after == before


async def _ledger_snapshot(
    session_factory: async_sessionmaker[AsyncSession],
) -> dict[str, int]:
    async with session_factory() as session:
        budget_count = await session.execute(select(func.count(BudgetPeriodModel.id)))
        category_budget_count = await session.execute(
            select(func.count(CategoryBudgetModel.id))
        )

    account = await fetch_account(session_factory)
    return {
        "transactions": await count_transactions(session_factory),
        "drafts": await count_ai_transaction_drafts(session_factory),
        "balance": account.current_balance_minor,
        "budgets": budget_count.scalar_one(),
        "category_budgets": category_budget_count.scalar_one(),
    }
