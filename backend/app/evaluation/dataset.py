from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from app.evaluation.schemas import BenchmarkRecord


class DatasetLoadError(ValueError):
    """Raised when a JSONL benchmark file cannot be parsed or validated."""


def load_jsonl_records(path: Path | str) -> list[BenchmarkRecord]:
    records: list[BenchmarkRecord] = []
    dataset_path = Path(path)

    with dataset_path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            try:
                payload: Any = json.loads(line)
            except json.JSONDecodeError as error:
                raise DatasetLoadError(
                    f"line {line_number}: malformed JSON: {error.msg}"
                ) from error
            try:
                records.append(BenchmarkRecord.model_validate(payload))
            except ValidationError as error:
                messages = "; ".join(
                    f"{'.'.join(str(part) for part in item['loc'])}: {item['msg']}"
                    for item in error.errors()
                )
                raise DatasetLoadError(f"line {line_number}: {messages}") from error

    if not records:
        raise DatasetLoadError("dataset has no records")
    return records
