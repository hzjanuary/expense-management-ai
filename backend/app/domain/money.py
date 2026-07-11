import re
import unicodedata
from dataclasses import dataclass

DEFAULT_CURRENCY = "VND"
SUPPORTED_CURRENCIES = frozenset({DEFAULT_CURRENCY})


class MoneyValidationError(ValueError):
    """Raised when a money value violates deterministic domain rules."""


@dataclass(frozen=True, slots=True)
class Money:
    amount_minor: int
    currency: str = DEFAULT_CURRENCY

    def __post_init__(self) -> None:
        if isinstance(self.amount_minor, bool) or not isinstance(
            self.amount_minor, int
        ):
            raise MoneyValidationError(
                "amount_minor must be an integer minor-unit value"
            )

        if self.amount_minor <= 0:
            raise MoneyValidationError("amount_minor must be positive")

        normalized_currency = normalize_currency(self.currency)
        object.__setattr__(self, "currency", normalized_currency)


def normalize_currency(currency: str) -> str:
    if not isinstance(currency, str) or not currency.strip():
        raise MoneyValidationError("currency is required")

    normalized = currency.strip().upper()
    if normalized not in SUPPORTED_CURRENCIES:
        raise MoneyValidationError(f"unsupported currency: {normalized}")

    return normalized


def format_minor_units(amount_minor: int, currency: str = DEFAULT_CURRENCY) -> str:
    money = Money(amount_minor=amount_minor, currency=currency)
    return f"{money.amount_minor} {money.currency}"


_AMOUNT_PATTERN = re.compile(
    r"^\s*(?P<number>[1-9][0-9]*)\s*(?P<unit>k|nghin|ngan|tr|trieu|m)?\s*$",
    re.IGNORECASE,
)
_UNIT_MULTIPLIERS = {
    None: 1,
    "k": 1_000,
    "nghin": 1_000,
    "ngan": 1_000,
    "tr": 1_000_000,
    "trieu": 1_000_000,
    "m": 1_000_000,
}


def normalize_vietnamese_amount(text: str) -> int | None:
    """Normalize a standalone Vietnamese amount shorthand into minor units.

    This intentionally parses only amount fragments such as ``35k`` or
    ``1 triệu``. Full chat-message parsing belongs to AI parsing stories.
    """

    if not isinstance(text, str):
        return None

    normalized_text = _strip_accents(text).lower()
    match = _AMOUNT_PATTERN.fullmatch(normalized_text)
    if match is None:
        return None

    number_text = match.group("number")
    unit = match.group("unit")
    try:
        amount = int(number_text)
    except ValueError:
        return None

    multiplier = _UNIT_MULTIPLIERS[unit.lower() if unit else None]
    return amount * multiplier


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(
        character for character in normalized if not unicodedata.combining(character)
    )
