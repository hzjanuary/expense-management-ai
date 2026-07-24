from __future__ import annotations

import ast
from pathlib import Path

EVALUATION_PACKAGE = Path(__file__).resolve().parents[2] / "app" / "evaluation"

FORBIDDEN_IMPORT_PREFIXES = (
    "app.application.ai_confirm",
    "app.application.ai_parse",
    "app.application.ai_query",
    "app.application.budgets",
    "app.application.dashboard",
    "app.application.exports",
    "app.application.transactions",
    "app.db",
)


def test_evaluation_package_has_no_forbidden_mutation_or_db_imports() -> None:
    offenders: list[str] = []
    for path in sorted(EVALUATION_PACKAGE.glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if _is_forbidden(alias.name):
                        offenders.append(f"{path.name}: import {alias.name}")
            elif isinstance(node, ast.ImportFrom) and node.module is not None:
                if _is_forbidden(node.module):
                    offenders.append(f"{path.name}: from {node.module} import ...")

    assert offenders == []


def _is_forbidden(module: str) -> bool:
    return any(
        module == prefix or module.startswith(f"{prefix}.")
        for prefix in FORBIDDEN_IMPORT_PREFIXES
    )
