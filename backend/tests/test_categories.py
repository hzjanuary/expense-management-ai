import pytest

from app.domain.categories import (
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_INCOME_CATEGORIES,
    CategoryValidationError,
    get_category,
    get_category_for_transaction,
    map_unknown_expense_category,
    map_unknown_income_category,
    resolve_expense_category_match,
    resolve_expense_category_slug,
)
from app.domain.enums import CategoryType, TransactionType


def test_default_expense_categories_are_stable() -> None:
    assert [category.slug for category in DEFAULT_EXPENSE_CATEGORIES] == [
        "food",
        "coffee",
        "transport",
        "shopping",
        "bills",
        "rent",
        "health",
        "education",
        "entertainment",
        "other",
    ]


def test_default_income_categories_are_stable() -> None:
    assert [category.slug for category in DEFAULT_INCOME_CATEGORIES] == [
        "salary",
        "bonus",
        "gift",
        "other_income",
    ]


def test_category_lookup_is_deterministic_and_normalizes_slug() -> None:
    category = get_category(" Food ")

    assert category.slug == "food"
    assert category.name == "Food"
    assert category.type == CategoryType.EXPENSE


def test_unknown_category_requires_explicit_mapping_helper() -> None:
    with pytest.raises(CategoryValidationError):
        get_category("street-food")


def test_expense_category_cannot_be_used_for_income() -> None:
    with pytest.raises(CategoryValidationError):
        get_category_for_transaction("food", TransactionType.INCOME)


def test_income_category_cannot_be_used_for_expense() -> None:
    with pytest.raises(CategoryValidationError):
        get_category_for_transaction("salary", TransactionType.EXPENSE)


def test_category_lookup_for_matching_transaction_type() -> None:
    expense = get_category_for_transaction("coffee", TransactionType.EXPENSE)
    income = get_category_for_transaction("bonus", TransactionType.INCOME)

    assert expense.slug == "coffee"
    assert income.slug == "bonus"


@pytest.mark.parametrize(
    ("text", "expected_slug"),
    [
        ("ăn uống", "food"),
        ("hôm nay ăn cơm gà", "food"),
        ("sáng uống cà phê sữa", "coffee"),
        ("uống trà sữa", "coffee"),
        ("đổ xăng", "transport"),
        ("đi Grab hết tiền", "transport"),
        ("mua vỉ thuốc", "health"),
        ("tối qua xem phim", "entertainment"),
    ],
)
def test_expense_category_aliases_resolve_to_canonical_slugs(
    text: str,
    expected_slug: str,
) -> None:
    assert resolve_expense_category_slug(text) == expected_slug


def test_expense_category_alias_match_prefers_specific_aliases() -> None:
    match = resolve_expense_category_match("uống cà phê sữa")

    assert match is not None
    assert match.slug == "coffee"
    assert match.alias == "cà phê sữa"


def test_unknown_expense_category_maps_to_other_only_through_helper() -> None:
    category = map_unknown_expense_category("street-food")

    assert category.slug == "other"
    assert category.type == CategoryType.EXPENSE


def test_unknown_income_category_maps_to_other_income_only_through_helper() -> None:
    category = map_unknown_income_category("freelance")

    assert category.slug == "other_income"
    assert category.type == CategoryType.INCOME


def test_explicit_mapping_helpers_preserve_known_categories() -> None:
    assert map_unknown_expense_category("transport").slug == "transport"
    assert map_unknown_income_category("gift").slug == "gift"


def test_mapping_helpers_do_not_hide_known_wrong_type_categories() -> None:
    with pytest.raises(CategoryValidationError):
        map_unknown_expense_category("salary")

    with pytest.raises(CategoryValidationError):
        map_unknown_income_category("food")
