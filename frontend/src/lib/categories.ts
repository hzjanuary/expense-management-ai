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
  { slug: "food", label: "Food" },
  { slug: "coffee", label: "Coffee" },
  { slug: "transport", label: "Transport" },
  { slug: "shopping", label: "Shopping" },
  { slug: "bills", label: "Bills" },
  { slug: "rent", label: "Rent" },
  { slug: "health", label: "Health" },
  { slug: "education", label: "Education" },
  { slug: "entertainment", label: "Entertainment" },
  { slug: "other", label: "Other" },
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
