import asyncio
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from tests.conftest import fetch_account, seed_cash_account, seed_transaction

JULY_11 = datetime(2026, 7, 11, 12, 0, tzinfo=UTC)
JULY_12 = datetime(2026, 7, 12, 12, 0, tzinfo=UTC)
JUNE_30 = datetime(2026, 6, 30, 12, 0, tzinfo=UTC)


async def seed_list_transactions(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_cash_account(session_factory)
    await seed_transaction(
        session_factory,
        transaction_id="00000000-0000-0000-0000-000000000001",
        transaction_type="expense",
        amount_minor=35_000,
        category_slug="food",
        description="ăn trưa",
        merchant="Bun Cha 24",
        occurred_at=JULY_11,
        created_at=datetime(2026, 7, 11, 12, 1, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="00000000-0000-0000-0000-000000000002",
        transaction_type="income",
        amount_minor=10_000_000,
        category_slug="salary",
        description="lương tháng 7",
        occurred_at=JULY_12,
        created_at=datetime(2026, 7, 12, 9, 1, tzinfo=UTC),
    )
    await seed_transaction(
        session_factory,
        transaction_id="00000000-0000-0000-0000-000000000003",
        transaction_type="expense",
        amount_minor=45_000,
        category_slug="coffee",
        description="cà phê sáng",
        merchant="Cafe Local",
        occurred_at=JUNE_30,
        created_at=datetime(2026, 6, 30, 8, 1, tzinfo=UTC),
    )


def item_ids(response_json: dict[str, object]) -> list[str]:
    items = response_json["items"]
    assert isinstance(items, list)
    return [item["id"] for item in items]


def test_list_returns_created_expense_and_income_transactions(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))

    response = client.get("/api/v1/transactions")

    assert response.status_code == 200
    body = response.json()
    assert body["limit"] == 50
    assert body["offset"] == 0
    assert body["total"] == 3
    assert {item["type"] for item in body["items"]} == {"expense", "income"}


def test_default_ordering_is_deterministic(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="00000000-0000-0000-0000-000000000004",
            transaction_type="expense",
            amount_minor=25_000,
            category_slug="food",
            description="ăn tối",
            occurred_at=JULY_11,
            created_at=datetime(2026, 7, 11, 13, 1, tzinfo=UTC),
        )
    )

    response = client.get("/api/v1/transactions")

    assert response.status_code == 200
    assert item_ids(response.json()) == [
        "00000000-0000-0000-0000-000000000002",
        "00000000-0000-0000-0000-000000000004",
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000003",
    ]


def test_month_filter_returns_only_transactions_in_that_month(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))

    response = client.get("/api/v1/transactions?month=2026-07")

    assert response.status_code == 200
    assert item_ids(response.json()) == [
        "00000000-0000-0000-0000-000000000002",
        "00000000-0000-0000-0000-000000000001",
    ]
    assert response.json()["total"] == 2


def test_category_filter_returns_matching_category_only(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))

    response = client.get("/api/v1/transactions?category=food")

    assert response.status_code == 200
    assert item_ids(response.json()) == ["00000000-0000-0000-0000-000000000001"]


def test_type_filter_returns_expense_or_income_only(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))

    expense_response = client.get("/api/v1/transactions?type=expense")
    income_response = client.get("/api/v1/transactions?type=income")

    assert expense_response.status_code == 200
    assert item_ids(expense_response.json()) == [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000003",
    ]
    assert income_response.status_code == 200
    assert item_ids(income_response.json()) == ["00000000-0000-0000-0000-000000000002"]


def test_text_search_matches_description_and_merchant(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))

    description_response = client.get("/api/v1/transactions?q=lương")
    merchant_response = client.get("/api/v1/transactions?q=local")

    assert description_response.status_code == 200
    assert item_ids(description_response.json()) == [
        "00000000-0000-0000-0000-000000000002"
    ]
    assert merchant_response.status_code == 200
    assert item_ids(merchant_response.json()) == [
        "00000000-0000-0000-0000-000000000003"
    ]


def test_pagination_returns_expected_items_limit_offset_and_total(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))

    response = client.get("/api/v1/transactions?limit=1&offset=1")

    assert response.status_code == 200
    body = response.json()
    assert body["limit"] == 1
    assert body["offset"] == 1
    assert body["total"] == 3
    assert item_ids(body) == ["00000000-0000-0000-0000-000000000001"]


def test_invalid_month_format_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/transactions?month=2026-7")

    assert response.status_code == 422
    assert response.json()["detail"] == "month must use YYYY-MM format"


def test_invalid_type_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/transactions?type=transfer")

    assert response.status_code == 422
    assert (
        response.json()["detail"]
        == "only expense and income transactions are supported"
    )


def test_invalid_category_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/transactions?category=not-a-category")

    assert response.status_code == 422
    assert response.json()["detail"] == "unknown category: not-a-category"


def test_valid_type_category_mismatch_returns_empty_result(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))

    response = client.get("/api/v1/transactions?type=expense&category=salary")

    assert response.status_code == 200
    assert response.json() == {"items": [], "limit": 50, "offset": 0, "total": 0}


def test_negative_offset_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/transactions?offset=-1")

    assert response.status_code == 422


def test_limit_above_max_is_rejected(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, _session_factory = transaction_api_client

    response = client.get("/api/v1/transactions?limit=101")

    assert response.status_code == 422


def test_soft_deleted_transactions_are_excluded_by_default(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))
    asyncio.run(
        seed_transaction(
            session_factory,
            transaction_id="00000000-0000-0000-0000-000000000005",
            transaction_type="expense",
            amount_minor=80_000,
            category_slug="shopping",
            description="deleted purchase",
            occurred_at=datetime(2026, 7, 13, 12, 0, tzinfo=UTC),
            deleted_at=datetime(2026, 7, 14, 12, 0, tzinfo=UTC),
        )
    )

    response = client.get("/api/v1/transactions")

    assert response.status_code == 200
    assert "00000000-0000-0000-0000-000000000005" not in item_ids(response.json())
    assert response.json()["total"] == 3


def test_list_endpoint_is_read_only_and_does_not_change_account_balance(
    transaction_api_client: tuple[TestClient, async_sessionmaker[AsyncSession]],
) -> None:
    client, session_factory = transaction_api_client
    asyncio.run(seed_list_transactions(session_factory))
    before = asyncio.run(fetch_account(session_factory)).current_balance_minor

    response = client.get("/api/v1/transactions?month=2026-07&q=ăn")

    assert response.status_code == 200
    after = asyncio.run(fetch_account(session_factory)).current_balance_minor
    assert after == before
