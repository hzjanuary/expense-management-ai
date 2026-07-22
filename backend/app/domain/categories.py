import re
import unicodedata
from dataclasses import dataclass

from app.domain.enums import CategoryType, TransactionType


class CategoryValidationError(ValueError):
    """Raised when category lookup or type validation fails."""


@dataclass(frozen=True, slots=True)
class CategoryDefinition:
    slug: str
    name: str
    type: CategoryType
    is_system: bool = True

    def supports_transaction_type(self, transaction_type: TransactionType) -> bool:
        return self.type.value == transaction_type.value


DEFAULT_EXPENSE_CATEGORIES: tuple[CategoryDefinition, ...] = (
    CategoryDefinition(slug="food", name="Food", type=CategoryType.EXPENSE),
    CategoryDefinition(slug="coffee", name="Coffee", type=CategoryType.EXPENSE),
    CategoryDefinition(slug="transport", name="Transport", type=CategoryType.EXPENSE),
    CategoryDefinition(slug="shopping", name="Shopping", type=CategoryType.EXPENSE),
    CategoryDefinition(slug="bills", name="Bills", type=CategoryType.EXPENSE),
    CategoryDefinition(slug="rent", name="Rent", type=CategoryType.EXPENSE),
    CategoryDefinition(slug="health", name="Health", type=CategoryType.EXPENSE),
    CategoryDefinition(slug="education", name="Education", type=CategoryType.EXPENSE),
    CategoryDefinition(
        slug="entertainment",
        name="Entertainment",
        type=CategoryType.EXPENSE,
    ),
    CategoryDefinition(slug="other", name="Other", type=CategoryType.EXPENSE),
)

DEFAULT_INCOME_CATEGORIES: tuple[CategoryDefinition, ...] = (
    CategoryDefinition(slug="salary", name="Salary", type=CategoryType.INCOME),
    CategoryDefinition(slug="bonus", name="Bonus", type=CategoryType.INCOME),
    CategoryDefinition(slug="gift", name="Gift", type=CategoryType.INCOME),
    CategoryDefinition(
        slug="other_income",
        name="Other income",
        type=CategoryType.INCOME,
    ),
)

DEFAULT_CATEGORIES: tuple[CategoryDefinition, ...] = (
    *DEFAULT_EXPENSE_CATEGORIES,
    *DEFAULT_INCOME_CATEGORIES,
)

_CATEGORIES_BY_SLUG = {category.slug: category for category in DEFAULT_CATEGORIES}

EXPENSE_CATEGORY_ALIASES: dict[str, tuple[str, ...]] = {
    "food": (
        "ăn uống",
        "đồ ăn",
        "ăn sáng",
        "ăn trưa",
        "ăn tối",
        "cơm",
        "nhà hàng",
        "ăn ngoài",
        "ẩm thực",
        "food",
    ),
    "coffee": ("cà phê", "cafe", "coffee", "trà sữa"),
    "transport": (
        "đi lại",
        "di chuyển",
        "xăng",
        "đổ xăng",
        "taxi",
        "grab",
        "xe buýt",
        "transport",
    ),
    "shopping": ("mua sắm", "quần áo", "shopping"),
    "bills": ("hóa đơn", "tiền điện", "tiền nước", "internet", "điện thoại", "bills"),
    "rent": ("tiền nhà", "thuê nhà", "tiền thuê", "rent"),
    "health": ("sức khỏe", "thuốc", "khám bệnh", "bệnh viện", "health"),
    "education": ("giáo dục", "học phí", "sách vở", "khóa học", "education"),
    "entertainment": ("giải trí", "xem phim", "trò chơi", "game", "entertainment"),
    "other": ("khác", "linh tinh", "other"),
}

_EXPENSE_ALIAS_PRIORITY: tuple[str, ...] = (
    "coffee",
    "transport",
    "shopping",
    "bills",
    "rent",
    "health",
    "education",
    "entertainment",
    "food",
    "other",
)


def normalize_category_slug(slug: str) -> str:
    if not isinstance(slug, str) or not slug.strip():
        raise CategoryValidationError("category slug is required")
    return slug.strip().lower()


def resolve_expense_category_slug(
    value: str | None,
    *,
    fallback_text: str | None = None,
) -> str | None:
    """Resolve canonical expense category slugs from slugs, labels, or aliases.

    Unknown analytical categories intentionally return None instead of mapping to
    "other"; callers can ask for clarification without distorting totals.
    """

    resolved = _resolve_expense_category_from_text(value)
    if resolved is not None:
        return resolved
    return _resolve_expense_category_from_text(fallback_text)


def get_category(slug: str) -> CategoryDefinition:
    normalized_slug = normalize_category_slug(slug)
    try:
        return _CATEGORIES_BY_SLUG[normalized_slug]
    except KeyError as error:
        raise CategoryValidationError(f"unknown category: {normalized_slug}") from error


def get_category_for_transaction(
    slug: str,
    transaction_type: TransactionType,
) -> CategoryDefinition:
    category = get_category(slug)
    if not category.supports_transaction_type(transaction_type):
        raise CategoryValidationError(
            f"category {category.slug} cannot be used for {transaction_type.value}"
        )
    return category


def get_category_display_name(slug: str) -> str:
    category = get_category(slug)
    names = {
        "food": "Ăn uống",
        "coffee": "Cà phê",
        "transport": "Đi lại",
        "shopping": "Mua sắm",
        "bills": "Hóa đơn",
        "rent": "Nhà ở",
        "health": "Sức khỏe",
        "education": "Học tập",
        "entertainment": "Giải trí",
        "other": "Khác",
        "salary": "Lương",
        "bonus": "Thưởng",
        "gift": "Quà tặng",
        "other_income": "Thu nhập khác",
    }
    return names.get(category.slug, category.name)


def map_unknown_expense_category(slug: str) -> CategoryDefinition:
    try:
        category = get_category(slug)
    except CategoryValidationError:
        return get_category("other")
    if not category.supports_transaction_type(TransactionType.EXPENSE):
        raise CategoryValidationError(
            f"category {category.slug} cannot be used for expense"
        )
    return category


def map_unknown_income_category(slug: str) -> CategoryDefinition:
    try:
        category = get_category(slug)
    except CategoryValidationError:
        return get_category("other_income")
    if not category.supports_transaction_type(TransactionType.INCOME):
        raise CategoryValidationError(
            f"category {category.slug} cannot be used for income"
        )
    return category


def _resolve_expense_category_from_text(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None

    normalized = _normalize_category_text(value)
    if normalized in _CATEGORIES_BY_SLUG:
        category = _CATEGORIES_BY_SLUG[normalized]
        if category.supports_transaction_type(TransactionType.EXPENSE):
            return category.slug
        return None

    matches: list[tuple[int, str]] = []
    for priority, slug in enumerate(_EXPENSE_ALIAS_PRIORITY):
        aliases = tuple(
            _normalize_category_text(alias) for alias in EXPENSE_CATEGORY_ALIASES[slug]
        )
        if any(_contains_normalized_alias(normalized, alias) for alias in aliases):
            matches.append((priority, slug))

    if not matches:
        return None
    matches.sort()
    return matches[0][1]


def _contains_normalized_alias(value: str, alias: str) -> bool:
    if not alias:
        return False
    return bool(re.search(rf"(^|\s){re.escape(alias)}($|\s)", value))


def _normalize_category_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().casefold())
    without_marks = "".join(
        character for character in normalized if unicodedata.category(character) != "Mn"
    )
    without_marks = without_marks.replace("đ", "d")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", without_marks)).strip()
