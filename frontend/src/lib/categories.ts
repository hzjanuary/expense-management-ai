export type ExpenseCategorySlug =
  | "food"
  | "coffee"
  | "transport"
  | "shopping"
  | "bills"
  | "rent"
  | "health"
  | "education"
  | "entertainment"
  | "other";

export type IncomeCategorySlug =
  | "salary"
  | "bonus"
  | "gift"
  | "other_income";

export type CategorySlug = ExpenseCategorySlug | IncomeCategorySlug;

export type CategoryOption = {
  label: string;
  slug: CategorySlug;
  type: "expense" | "income";
};

export const EXPENSE_CATEGORY_OPTIONS: CategoryOption[] = [
  { slug: "food", label: "Ăn uống", type: "expense" },
  { slug: "coffee", label: "Cà phê", type: "expense" },
  { slug: "transport", label: "Đi lại", type: "expense" },
  { slug: "shopping", label: "Mua sắm", type: "expense" },
  { slug: "bills", label: "Hóa đơn", type: "expense" },
  { slug: "rent", label: "Nhà ở", type: "expense" },
  { slug: "health", label: "Sức khỏe", type: "expense" },
  { slug: "education", label: "Học tập", type: "expense" },
  { slug: "entertainment", label: "Giải trí", type: "expense" },
  { slug: "other", label: "Khác", type: "expense" },
];

export const INCOME_CATEGORY_OPTIONS: CategoryOption[] = [
  { slug: "salary", label: "Lương", type: "income" },
  { slug: "bonus", label: "Thưởng", type: "income" },
  { slug: "gift", label: "Quà tặng", type: "income" },
  { slug: "other_income", label: "Thu nhập khác", type: "income" },
];

export const CATEGORY_OPTIONS: CategoryOption[] = [
  ...EXPENSE_CATEGORY_OPTIONS,
  ...INCOME_CATEGORY_OPTIONS,
];

const EXPENSE_CATEGORY_SLUGS = new Set<string>(
  EXPENSE_CATEGORY_OPTIONS.map((category) => category.slug),
);

export function isExpenseCategorySlug(
  value: string,
): value is ExpenseCategorySlug {
  return EXPENSE_CATEGORY_SLUGS.has(value);
}

export function formatCategoryLabel(slug: string): string {
  return (
    CATEGORY_OPTIONS.find((category) => category.slug === slug)?.label ??
    slug
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
