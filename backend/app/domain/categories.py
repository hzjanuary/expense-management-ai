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


def normalize_category_slug(slug: str) -> str:
    if not isinstance(slug, str) or not slug.strip():
        raise CategoryValidationError("category slug is required")
    return slug.strip().lower()


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
