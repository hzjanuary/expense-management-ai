from __future__ import annotations

import json
from pathlib import Path

from app.evaluation.cli import main

from .test_dataset_validation import DATASET_PATH, valid_row, write_jsonl


def test_cli_success_exit_code(capsys: object) -> None:
    exit_code = main(["validate", str(DATASET_PATH), "--strict"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "validation_status: VALID" in captured.out
    assert "record_count: 120" in captured.out


def test_cli_failure_exit_code(tmp_path: Path, capsys: object) -> None:
    dataset = tmp_path / "invalid.jsonl"
    write_jsonl(dataset, [valid_row(id="sample-001"), valid_row(id="sample-001")])

    exit_code = main(["validate", str(dataset), "--show-errors", "1"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "validation_status: INVALID" in captured.out
    assert "duplicate id" in captured.out


def test_cli_json_output(tmp_path: Path) -> None:
    output = tmp_path / "summary.json"

    exit_code = main(
        [
            "validate",
            str(DATASET_PATH),
            "--strict",
            "--json-output",
            str(output),
        ]
    )
    payload = json.loads(output.read_text(encoding="utf-8"))

    assert exit_code == 0
    assert payload["valid"] is True
    assert payload["record_count"] == 120
    assert payload["schema_version"] == "vi-finance-benchmark-v1"
