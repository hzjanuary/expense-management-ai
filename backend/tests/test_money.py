from decimal import Decimal

import pytest

from app.domain.money import (
    DEFAULT_CURRENCY,
    Money,
    MoneyValidationError,
    format_minor_units,
    normalize_currency,
    normalize_vietnamese_amount,
)


def test_money_accepts_integer_minor_units_and_normalizes_currency() -> None:
    money = Money(amount_minor=35_000, currency="vnd")

    assert money.amount_minor == 35_000
    assert money.currency == "VND"


def test_money_uses_default_currency() -> None:
    money = Money(amount_minor=1_000_000)

    assert money.currency == DEFAULT_CURRENCY


@pytest.mark.parametrize("amount", [35.5, Decimal("35.5"), "35000", True])
def test_money_rejects_non_integer_amounts(amount: object) -> None:
    with pytest.raises(MoneyValidationError):
        Money(amount_minor=amount, currency="VND")  # type: ignore[arg-type]


@pytest.mark.parametrize("amount", [0, -35_000])
def test_money_rejects_non_positive_amounts(amount: int) -> None:
    with pytest.raises(MoneyValidationError):
        Money(amount_minor=amount, currency="VND")


@pytest.mark.parametrize("currency", ["", "   ", "INVALID", "usd"])
def test_money_rejects_invalid_currency(currency: str) -> None:
    with pytest.raises(MoneyValidationError):
        Money(amount_minor=35_000, currency=currency)


def test_currency_normalization_supports_vnd_only_for_mvp() -> None:
    assert normalize_currency(" vnd ") == "VND"


def test_format_minor_units_is_intentionally_simple() -> None:
    assert format_minor_units(35_000, "vnd") == "35000 VND"


@pytest.mark.parametrize(
    ("raw_amount", "expected"),
    [
        ("35k", 35_000),
        ("35 nghìn", 35_000),
        ("35 ngàn", 35_000),
        ("1tr", 1_000_000),
        ("1 triệu", 1_000_000),
        ("1m", 1_000_000),
        ("35000", 35_000),
    ],
)
def test_vietnamese_amount_normalization(raw_amount: str, expected: int) -> None:
    assert normalize_vietnamese_amount(raw_amount) == expected


@pytest.mark.parametrize(
    "raw_amount",
    ["", "0", "-35k", "35.5k", "hom nay toi tieu 35k", "abc"],
)
def test_vietnamese_amount_normalization_rejects_invalid_fragments(
    raw_amount: str,
) -> None:
    assert normalize_vietnamese_amount(raw_amount) is None
