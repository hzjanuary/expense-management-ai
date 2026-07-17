import asyncio
import csv
from datetime import UTC, datetime
from io import StringIO

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.routes.transactions import get_export_max_rows, get_export_time
from app.db.models import BudgetPeriodModel, CategoryBudgetModel, TransactionModel
from tests.conftest import (
    count_ai_transaction_drafts,
    count_transactions,
    fetch_account,
    seed_cash_account,
    seed_transaction,
)

EXPORT_NOW = datetime(2026, 7, 17, 8, 0, tzinfo=UTC)


async def seed_export_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory, balance_minor=1_000_000)
    await seed_transaction(
        session_factory,
        transaction_id="98000000-0000-0000-0000-000000000001",
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description='ăn trưa, bún "đặc biệt"\nngon',
        merchant="@Bun Cha 24",
        occurred_at=datetime(2026, 7, 11, 12, 0, tzinfo=UTC),
        created_at=datetime(2026, 7, 11, 12, 1, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="98000000-0000-0000-0000-000000000002",
        transaction_type="income",
        amount_minor=10_000_000,
        category_slug="salary",
        description="lương tháng 7",
        merchant=None,
        occurred_at=datetime(2026, 7, 12, 9, 0, tzinfo=UTC),
        created_at=datetime(2026, 7, 12, 9, 1, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="98000000-0000-0000-0000-000000000003",
        transaction_type="expense",
        amount_minor=45_000,
        category_slug="coffee",
        description='=HYPERLINK("bad")',
        merchant="+Cafe Local",
        occurred_at=datetime(2026, 6, 30, 8, 0, tzinfo=UTC),
        created_at=datetime(2026, 6, 30, 8, 1, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="98000000-0000-0000-0000-000000000004",
        transaction_type="expense",
        amount_minor=80_000,
        category_slug="shopping",
        description="deleted purchase",
        occurred_at=datetime(2026, 7, 13, 12, 0, tzinfo=UTC),
        created_at=datetime(2026, 7, 13, 12, 1, tzinfo=UTC),
        deleted_at=datetime(2026, 7, 14, 12, 0, tzinfo=UTC),
    )

    async with session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(TransactionModel).where(
                    TransactionModel.id == "98000000-0000-0000-0000-000000000001"
                )
            )
            transaction = result.scalar_one()
            transaction.raw_user_text = "raw private AI text"
            transaction.parser_confidence = "high"


async def count_budget_periods(
    session_factory: async_sessionmaker[AsyncSession],
) -> int:
    async with session_factory() as session:
        result = await session.execute(select(func.count(BudgetPeriodModel.id)))
        return result.scalar_one()


async def count_category_budgets(
    session_factory: async_sessionmaker[AsyncSession],
) -> int:
    async with session_factory() as session:
        result = await session.execute(select(func.count(CategoryBudgetModel.id)))
        return result.scalar_one()


async def fetch_transaction_amounts(
    session_factory: async_sessionmaker[AsyncSession],
) -> list[int]:
    async with session_factory() as session:
        result = await session.execute(
            select(TransactionModel.amount_minor).order_by(TransactionModel.id)
        )
        return [int(amount) for amount in result.scalars().all()]


def override_export_time(client: TestClient) -> None:
    client.app.dependency_overrides[get_export_time] = lambda: EXPORT_NOW


def override_export_max_rows(client: TestClient, value: int) -> None:
    client.app.dependency_overrides[get_export_max_rows] = lambda: value


def export_transactions(client: TestClient, query: str = ""):
    suffix = f"?{query}" if query else ""
    return client.get(f"/api/v1/transactions/export{suffix}")


def parse_csv(text: str) -> list[dict[str, str]]:
    return list(csv.DictReader(StringIO(text)))


def test_csv_export_returns_attachment_with_header_and_records(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_export_transactions(session_factory))

    response = export_transactions(client, "format=csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"] == (
        'attachment; filename="pocket-ledger-transactions-all.csv"'
    )
    assert response.text.splitlines()[0] == (
        "id,type,amount_minor,currency,category_slug,description,merchant,"
        "occurred_at,source,created_at"
    )
    rows = parse_csv(response.text)
    assert [row["id"] for row in rows] == [
        "98000000-0000-0000-0000-000000000002",
        "98000000-0000-0000-0000-000000000001",
        "98000000-0000-0000-0000-000000000003",
    ]
    assert {row["type"] for row in rows} == {"expense", "income"}
    assert rows[1]["description"] == 'ăn trưa, bún "đặc biệt"\nngon'
    assert rows[1]["merchant"] == "'@Bun Cha 24"
    assert rows[2]["description"] == '\'=HYPERLINK("bad")'
    assert rows[2]["merchant"] == "'+Cafe Local"


def test_json_export_returns_attachment_and_allowlisted_fields(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_export_time(client)
    asyncio.run(seed_export_transactions(session_factory))

    response = export_transactions(client, "format=json")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.headers["content-disposition"] == (
        'attachment; filename="pocket-ledger-transactions-all.json"'
    )
    payload = response.json()
    assert payload["exported_at"] == "2026-07-17T08:00:00+00:00"
    assert payload["filters"] == {
        "month": None,
        "category": None,
        "type": None,
        "q": None,
    }
    assert payload["count"] == 3
    first = payload["transactions"][0]
    assert set(first) == {
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
    }
    serialized = response.text
    assert "raw_user_text" not in serialized
    assert "parser_confidence" not in serialized
    assert "deleted_at" not in serialized
    assert "provider" not in serialized
    assert "raw private AI text" not in serialized


def test_export_respects_month_category_type_and_text_filters(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_export_transactions(session_factory))

    month_response = export_transactions(client, "format=json&month=2026-07")
    category_response = export_transactions(client, "format=json&category=food")
    type_response = export_transactions(client, "format=json&type=income")
    search_response = export_transactions(client, "format=json&q=Local")

    assert [item["id"] for item in month_response.json()["transactions"]] == [
        "98000000-0000-0000-0000-000000000002",
        "98000000-0000-0000-0000-000000000001",
    ]
    assert [item["id"] for item in category_response.json()["transactions"]] == [
        "98000000-0000-0000-0000-000000000001"
    ]
    assert [item["id"] for item in type_response.json()["transactions"]] == [
        "98000000-0000-0000-0000-000000000002"
    ]
    assert [item["id"] for item in search_response.json()["transactions"]] == [
        "98000000-0000-0000-0000-000000000003"
    ]


def test_export_excludes_soft_deleted_transactions(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_export_transactions(session_factory))

    response = export_transactions(client, "format=json")

    ids = [item["id"] for item in response.json()["transactions"]]
    assert "98000000-0000-0000-0000-000000000004" not in ids


def test_empty_filtered_export_is_valid(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_export_transactions(session_factory))

    csv_response = export_transactions(client, "format=csv&category=rent")
    json_response = export_transactions(client, "format=json&category=rent")

    assert csv_response.status_code == 200
    assert parse_csv(csv_response.text) == []
    assert json_response.status_code == 200
    assert json_response.json()["count"] == 0
    assert json_response.json()["transactions"] == []


def test_export_rejects_invalid_format_and_filters(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    invalid_format = export_transactions(client, "format=xlsx")
    invalid_month = export_transactions(client, "format=json&month=2026-7")
    invalid_category = export_transactions(client, "format=json&category=bad")
    invalid_type = export_transactions(client, "format=json&type=transfer")

    assert invalid_format.status_code == 422
    assert invalid_format.json()["detail"] == "format must be csv or json"
    assert invalid_month.status_code == 422
    assert invalid_month.json()["detail"] == "month must use YYYY-MM format"
    assert invalid_category.status_code == 422
    assert invalid_category.json()["detail"] == "unknown category: bad"
    assert invalid_type.status_code == 422
    assert invalid_type.json()["detail"] == (
        "only expense and income transactions are supported"
    )


def test_export_row_limit_is_enforced(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    override_export_max_rows(client, 2)
    asyncio.run(seed_export_transactions(session_factory))

    response = export_transactions(client, "format=json")

    assert response.status_code == 413
    assert response.json()["detail"] == "export contains 3 rows, exceeding limit 2"


def test_export_is_read_only(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_export_transactions(session_factory))
    before_balance = asyncio.run(fetch_account(session_factory)).current_balance_minor
    before_transaction_count = asyncio.run(count_transactions(session_factory))
    before_transaction_amounts = asyncio.run(fetch_transaction_amounts(session_factory))
    before_budget_count = asyncio.run(count_budget_periods(session_factory))
    before_category_budget_count = asyncio.run(count_category_budgets(session_factory))
    before_draft_count = asyncio.run(count_ai_transaction_drafts(session_factory))

    response = export_transactions(client, "format=json&month=2026-07")

    assert response.status_code == 200
    assert asyncio.run(fetch_account(session_factory)).current_balance_minor == (
        before_balance
    )
    assert asyncio.run(count_transactions(session_factory)) == before_transaction_count
    assert asyncio.run(fetch_transaction_amounts(session_factory)) == (
        before_transaction_amounts
    )
    assert asyncio.run(count_budget_periods(session_factory)) == before_budget_count
    assert asyncio.run(count_category_budgets(session_factory)) == (
        before_category_budget_count
    )
    assert asyncio.run(count_ai_transaction_drafts(session_factory)) == (
        before_draft_count
    )
