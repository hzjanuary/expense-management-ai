import { splitMonthValue } from "@/lib/dashboard";

export type CategoryBudgetConfig = {
  category_slug: string;
  budget_minor: number;
};

export type MonthlyBudgetResponse = {
  year: number;
  month: number;
  currency: string;
  total_budget_minor: number;
  category_budgets: CategoryBudgetConfig[];
};

export type UpsertMonthlyBudgetRequest = {
  currency: string;
  total_budget_minor: number;
  category_budgets: CategoryBudgetConfig[];
};

export type CategoryBudgetRemaining = {
  category_slug: string;
  budget_minor: number;
  spent_minor: number;
  remaining_minor: number;
  is_over_budget: boolean;
};

export type BudgetRemainingResponse = {
  year: number;
  month: number;
  currency: string;
  total_budget_minor: number;
  total_expense_minor: number;
  total_remaining_minor: number;
  categories: CategoryBudgetRemaining[];
};

export class BudgetApiError extends Error {
  constructor(message = "Unable to load budget status") {
    super(message);
    this.name = "BudgetApiError";
  }
}

export class BudgetNotConfiguredError extends BudgetApiError {
  constructor(message = "No budget configured for this month.") {
    super(message);
    this.name = "BudgetNotConfiguredError";
  }
}

export async function fetchBudgetRemaining(
  monthValue: string,
  currency = "VND",
  signal?: AbortSignal,
): Promise<BudgetRemainingResponse> {
  const { year, month } = splitMonthValue(monthValue);
  const response = await fetch(
    `/api/budgets/monthly/${year}/${month}/remaining?currency=${encodeURIComponent(
      currency,
    )}`,
    {
      cache: "no-store",
      signal,
    },
  );

  if (response.status === 404) {
    throw new BudgetNotConfiguredError();
  }

  if (!response.ok) {
    throw new BudgetApiError(await readSafeError(response));
  }

  const payload: unknown = await response.json();
  return parseBudgetRemainingResponse(payload);
}

export async function fetchMonthlyBudget(
  monthValue: string,
  currency = "VND",
  signal?: AbortSignal,
): Promise<MonthlyBudgetResponse> {
  const { year, month } = splitMonthValue(monthValue);
  const response = await fetch(
    `/api/budgets/monthly/${year}/${month}?currency=${encodeURIComponent(
      currency,
    )}`,
    {
      cache: "no-store",
      signal,
    },
  );

  if (response.status === 404) {
    throw new BudgetNotConfiguredError();
  }

  if (!response.ok) {
    throw new BudgetApiError(await readSafeError(response));
  }

  const payload: unknown = await response.json();
  return parseMonthlyBudgetResponse(payload);
}

export async function upsertMonthlyBudget(
  monthValue: string,
  request: UpsertMonthlyBudgetRequest,
  signal?: AbortSignal,
): Promise<MonthlyBudgetResponse> {
  const { year, month } = splitMonthValue(monthValue);
  const response = await fetch(`/api/budgets/monthly/${year}/${month}`, {
    body: JSON.stringify(request),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
    signal,
  });

  if (!response.ok) {
    throw new BudgetApiError(await readSafeError(response));
  }

  const payload: unknown = await response.json();
  return parseMonthlyBudgetResponse(payload);
}

export function parseMonthlyBudgetResponse(
  payload: unknown,
): MonthlyBudgetResponse {
  if (!isRecord(payload)) {
    throw new BudgetApiError("Invalid budget setup response");
  }

  const {
    year,
    month,
    currency,
    total_budget_minor: totalBudgetMinor,
    category_budgets: categoryBudgets,
  } = payload;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    typeof currency !== "string" ||
    !Number.isInteger(totalBudgetMinor) ||
    !Array.isArray(categoryBudgets)
  ) {
    throw new BudgetApiError("Invalid budget setup response");
  }

  return {
    year: year as number,
    month: month as number,
    currency,
    total_budget_minor: totalBudgetMinor as number,
    category_budgets: categoryBudgets.map(parseCategoryBudgetConfig),
  };
}

export function parseBudgetRemainingResponse(
  payload: unknown,
): BudgetRemainingResponse {
  if (!isRecord(payload)) {
    throw new BudgetApiError("Invalid budget remaining response");
  }

  const {
    year,
    month,
    currency,
    total_budget_minor: totalBudgetMinor,
    total_expense_minor: totalExpenseMinor,
    total_remaining_minor: totalRemainingMinor,
    categories,
  } = payload;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    typeof currency !== "string" ||
    !Number.isInteger(totalBudgetMinor) ||
    !Number.isInteger(totalExpenseMinor) ||
    !Number.isInteger(totalRemainingMinor) ||
    !Array.isArray(categories)
  ) {
    throw new BudgetApiError("Invalid budget remaining response");
  }

  return {
    year: year as number,
    month: month as number,
    currency,
    total_budget_minor: totalBudgetMinor as number,
    total_expense_minor: totalExpenseMinor as number,
    total_remaining_minor: totalRemainingMinor as number,
    categories: categories.map(parseCategoryBudgetRemaining),
  };
}

function parseCategoryBudgetConfig(payload: unknown): CategoryBudgetConfig {
  if (!isRecord(payload)) {
    throw new BudgetApiError("Invalid category budget response");
  }

  const {
    category_slug: categorySlug,
    budget_minor: budgetMinor,
  } = payload;

  if (typeof categorySlug !== "string" || !Number.isInteger(budgetMinor)) {
    throw new BudgetApiError("Invalid category budget response");
  }

  return {
    category_slug: categorySlug,
    budget_minor: budgetMinor as number,
  };
}

async function readSafeError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    return "Unable to load budget status";
  }

  return "Unable to load budget status";
}

function parseCategoryBudgetRemaining(
  payload: unknown,
): CategoryBudgetRemaining {
  if (!isRecord(payload)) {
    throw new BudgetApiError("Invalid budget category response");
  }

  const {
    category_slug: categorySlug,
    budget_minor: budgetMinor,
    spent_minor: spentMinor,
    remaining_minor: remainingMinor,
    is_over_budget: isOverBudget,
  } = payload;

  if (
    typeof categorySlug !== "string" ||
    !Number.isInteger(budgetMinor) ||
    !Number.isInteger(spentMinor) ||
    !Number.isInteger(remainingMinor) ||
    typeof isOverBudget !== "boolean"
  ) {
    throw new BudgetApiError("Invalid budget category response");
  }

  return {
    category_slug: categorySlug,
    budget_minor: budgetMinor as number,
    spent_minor: spentMinor as number,
    remaining_minor: remainingMinor as number,
    is_over_budget: isOverBudget,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
