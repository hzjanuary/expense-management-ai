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

export type CategoryOption = {
  label: string;
  slug: ExpenseCategorySlug;
};

export const EXPENSE_CATEGORY_OPTIONS: CategoryOption[] = [
  { slug: "food", label: "Ăn uống" },
  { slug: "coffee", label: "Cà phê" },
  { slug: "transport", label: "Đi lại" },
  { slug: "shopping", label: "Mua sắm" },
  { slug: "bills", label: "Hóa đơn" },
  { slug: "rent", label: "Nhà ở" },
  { slug: "health", label: "Sức khỏe" },
  { slug: "education", label: "Học tập" },
  { slug: "entertainment", label: "Giải trí" },
  { slug: "other", label: "Khác" },
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
    EXPENSE_CATEGORY_OPTIONS.find((category) => category.slug === slug)?.label ??
    slug
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
