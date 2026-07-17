import csv
import io
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.transactions import (
    ListTransactionsQuery,
    TransactionValidationError,
    list_filtered_transactions,
)
from app.db.models import TransactionModel

ExportFormat = Literal["csv", "json"]

EXPORT_FIELDS = (
    "id",
    "type",
    "amount_minor",
    "currency",
    "category_slug",
    "description",
    "merchant",
    "occurred_at",
    "source",
    "created_at",
)

_DANGEROUS_CSV_PREFIXES = ("=", "+", "-", "@")


class TransactionExportValidationError(ValueError):
    """Raised when a transaction export request is invalid."""


@dataclass(frozen=True, slots=True)
class ExportTransactionsQuery:
    format: str = "csv"
    month: str | None = None
    category: str | None = None
    type: str | None = None
    q: str | None = None


@dataclass(frozen=True, slots=True)
class TransactionExportResult:
    content: str
    media_type: str
    filename: str
    row_count: int


async def export_transactions(
    session: AsyncSession,
    query: ExportTransactionsQuery,
    *,
    exported_at: datetime,
    max_rows: int,
) -> TransactionExportResult:
    export_format = _parse_export_format(query.format)
    if max_rows <= 0:
        raise TransactionExportValidationError("export row limit must be positive")

    try:
        result = await list_filtered_transactions(
            session,
            ListTransactionsQuery(
                month=query.month,
                category=query.category,
                type=query.type,
                q=query.q,
                limit=max_rows,
                offset=0,
            ),
        )
    except TransactionValidationError as error:
        raise TransactionExportValidationError(str(error)) from error

    if result.total > max_rows:
        raise TransactionExportValidationError(
            f"export contains {result.total} rows, exceeding limit {max_rows}"
        )

    records = [_transaction_record(transaction) for transaction in result.items]
    filename = _export_filename(export_format, query)

    if export_format == "csv":
        return TransactionExportResult(
            content=_serialize_csv(records),
            media_type="text/csv; charset=utf-8",
            filename=filename,
            row_count=len(records),
        )

    return TransactionExportResult(
        content=_serialize_json(
            exported_at=exported_at,
            query=query,
            records=records,
        ),
        media_type="application/json",
        filename=filename,
        row_count=len(records),
    )


def _parse_export_format(value: str) -> ExportFormat:
    if value == "csv":
        return "csv"
    if value == "json":
        return "json"
    raise TransactionExportValidationError("format must be csv or json")


def _transaction_record(transaction: TransactionModel) -> dict[str, object]:
    return {
        "id": transaction.id,
        "type": transaction.type,
        "amount_minor": transaction.amount_minor,
        "currency": transaction.currency,
        "category_slug": transaction.category_slug,
        "description": transaction.description,
        "merchant": transaction.merchant,
        "occurred_at": _isoformat(transaction.occurred_at),
        "source": transaction.source,
        "created_at": _isoformat(transaction.created_at),
    }


def _serialize_csv(records: list[dict[str, object]]) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=list(EXPORT_FIELDS), lineterminator="\n")
    writer.writeheader()
    for record in records:
        writer.writerow({field: _csv_cell(record[field]) for field in EXPORT_FIELDS})
    return output.getvalue()


def _serialize_json(
    *,
    exported_at: datetime,
    query: ExportTransactionsQuery,
    records: list[dict[str, object]],
) -> str:
    payload = {
        "exported_at": _isoformat(exported_at),
        "filters": {
            "month": query.month,
            "category": query.category,
            "type": query.type,
            "q": query.q,
        },
        "count": len(records),
        "transactions": records,
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def _csv_cell(value: object) -> object:
    if value is None:
        return ""
    if not isinstance(value, str):
        return value
    if value.startswith(_DANGEROUS_CSV_PREFIXES):
        return f"'{value}"
    return value


def _isoformat(value: datetime) -> str:
    return value.isoformat()


def _export_filename(
    export_format: ExportFormat,
    query: ExportTransactionsQuery,
) -> str:
    parts = ["pocket-ledger-transactions"]
    if query.month:
        parts.append(query.month)
    if query.category:
        parts.append(query.category)
    if query.type:
        parts.append(query.type)
    if query.q:
        parts.append("search")
    if len(parts) == 1:
        parts.append("all")
    return "-".join(parts) + f".{export_format}"
