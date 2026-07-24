from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from collections.abc import Iterable
from pathlib import Path

from app.evaluation.dataset import DatasetLoadError, load_jsonl_records
from app.evaluation.schemas import SCHEMA_VERSION, BenchmarkRecord, ValidationSummary

EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){9,10}(?!\d)")
LONG_NUMBER_PATTERN = re.compile(r"(?<!\d)(?:\d[\s-]?){12,19}(?!\d)")


def validate_dataset(path: Path | str, *, strict: bool = False) -> ValidationSummary:
    errors: list[str] = []
    records: list[BenchmarkRecord] = []

    try:
        records = load_jsonl_records(path)
    except DatasetLoadError as error:
        errors.append(str(error))

    if records:
        errors.extend(_record_set_errors(records, strict=strict))

    valid = not errors
    checksum = compute_dataset_checksum(records) if valid else None
    return ValidationSummary(
        schema_version=SCHEMA_VERSION,
        valid=valid,
        record_count=len(records),
        split_counts=_counts(record.split.value for record in records),
        intent_counts=_counts(record.intent.value for record in records),
        tag_counts=_counts(tag for record in records for tag in record.tags),
        duplicate_status="ok" if valid else "failed",
        checksum=checksum,
        errors=errors,
    )


def compute_dataset_checksum(records: list[BenchmarkRecord]) -> str:
    """Return a stable SHA-256 over validated records sorted by id.

    Normalization is JSON serialization of each Pydantic model in ``json`` mode
    with sorted keys, no insignificant whitespace, UTF-8 text preserved, and
    records ordered lexicographically by stable ``id``.
    """

    lines = [
        json.dumps(
            record.model_dump(mode="json"),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        for record in sorted(records, key=lambda item: item.id)
    ]
    normalized = "\n".join(lines).encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()


def _record_set_errors(records: list[BenchmarkRecord], *, strict: bool) -> list[str]:
    errors: list[str] = []
    ids: set[str] = set()
    texts_by_split: set[tuple[str, str]] = set()

    for record in records:
        if record.id in ids:
            errors.append(f"duplicate id: {record.id}")
        ids.add(record.id)

        text_key = (record.split.value, record.text.casefold().strip())
        if text_key in texts_by_split and not _duplicate_text_explicitly_allowed(
            record
        ):
            errors.append(
                f"duplicate text in split {record.split.value}: {record.text}"
            )
        texts_by_split.add(text_key)

        if _contains_personal_data(record.text):
            errors.append(f"possible personal data in record {record.id}")

    return errors


def _counts(values: Iterable[str]) -> dict[str, int]:
    return dict(sorted(Counter(values).items()))


def _duplicate_text_explicitly_allowed(record: BenchmarkRecord) -> bool:
    return bool(record.notes and "duplicate_text_allowed" in record.notes)


def _contains_personal_data(value: str) -> bool:
    compact_digits = re.sub(r"\D", "", value)
    return (
        EMAIL_PATTERN.search(value) is not None
        or PHONE_PATTERN.search(value) is not None
        or (len(compact_digits) >= 12 and LONG_NUMBER_PATTERN.search(value) is not None)
    )
