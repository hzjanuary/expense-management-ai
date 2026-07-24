from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import NoReturn

from app.evaluation.schemas import ValidationSummary
from app.evaluation.validation import validate_dataset


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.evaluation.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser(
        "validate", help="validate a benchmark JSONL dataset"
    )
    validate_parser.add_argument("dataset", type=Path)
    validate_parser.add_argument("--json-output", type=Path)
    validate_parser.add_argument("--strict", action="store_true")
    validate_parser.add_argument("--show-errors", type=int, default=10)

    args = parser.parse_args(argv)
    if args.command == "validate":
        summary = validate_dataset(args.dataset, strict=args.strict)
        if args.json_output is not None:
            args.json_output.write_text(
                json.dumps(
                    summary.model_dump(mode="json"),
                    ensure_ascii=False,
                    indent=2,
                    sort_keys=True,
                )
                + "\n",
                encoding="utf-8",
            )
        _print_summary(summary, show_errors=args.show_errors)
        return 0 if summary.valid else 1

    _unreachable()


def _print_summary(summary: ValidationSummary, *, show_errors: int) -> None:
    data = summary.model_dump(mode="json")
    print(f"validation_status: {'VALID' if data['valid'] else 'INVALID'}")
    print(f"schema_version: {data['schema_version']}")
    print(f"record_count: {data['record_count']}")
    print(f"split_counts: {json.dumps(data['split_counts'], sort_keys=True)}")
    print(f"intent_counts: {json.dumps(data['intent_counts'], sort_keys=True)}")
    print(f"tag_counts: {json.dumps(data['tag_counts'], sort_keys=True)}")
    print(f"duplicate_status: {data['duplicate_status']}")
    print(f"dataset_checksum: {data['checksum']}")
    if data["errors"]:
        print("errors:")
        for error in data["errors"][:show_errors]:
            print(f"- {error}")


def _unreachable() -> NoReturn:
    raise RuntimeError("unreachable command")


if __name__ == "__main__":
    raise SystemExit(main())
