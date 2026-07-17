export type DashboardCategoryBreakdown = {
  category_slug: string;
  type: string;
  amount_minor: number;
};

export type DashboardSummaryResponse = {
  currency: string;
  total_balance_minor: number;
  monthly_income_minor: number;
  monthly_expense_minor: number;
  category_breakdown: DashboardCategoryBreakdown[];
};

export class DashboardApiError extends Error {
  constructor(message = "Unable to load dashboard summary") {
    super(message);
    this.name = "DashboardApiError";
  }
}

export function isMonthValue(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function getCurrentMonthValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function splitMonthValue(value: string): { year: number; month: number } {
  if (!isMonthValue(value)) {
    throw new DashboardApiError("Invalid selected month");
  }

  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

export async function fetchDashboardSummary(
  month: string,
  signal?: AbortSignal,
): Promise<DashboardSummaryResponse> {
  if (!isMonthValue(month)) {
    throw new DashboardApiError("Invalid selected month");
  }

  const response = await fetch(
    `/api/dashboard/summary?month=${encodeURIComponent(month)}`,
    {
      cache: "no-store",
      signal,
    },
  );

  if (!response.ok) {
    throw new DashboardApiError(await readSafeError(response));
  }

  const payload: unknown = await response.json();
  return parseDashboardSummaryResponse(payload);
}

export function parseDashboardSummaryResponse(
  payload: unknown,
): DashboardSummaryResponse {
  if (!isRecord(payload)) {
    throw new DashboardApiError("Invalid dashboard summary response");
  }

  const {
    currency,
    total_balance_minor: totalBalanceMinor,
    monthly_income_minor: monthlyIncomeMinor,
    monthly_expense_minor: monthlyExpenseMinor,
    category_breakdown: categoryBreakdown,
  } = payload;

  if (
    typeof currency !== "string" ||
    !Number.isInteger(totalBalanceMinor) ||
    !Number.isInteger(monthlyIncomeMinor) ||
    !Number.isInteger(monthlyExpenseMinor) ||
    !Array.isArray(categoryBreakdown)
  ) {
    throw new DashboardApiError("Invalid dashboard summary response");
  }

  return {
    currency,
    total_balance_minor: totalBalanceMinor as number,
    monthly_income_minor: monthlyIncomeMinor as number,
    monthly_expense_minor: monthlyExpenseMinor as number,
    category_breakdown: categoryBreakdown.map(parseCategoryBreakdown),
  };
}

async function readSafeError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    return "Unable to load dashboard summary";
  }

  return "Unable to load dashboard summary";
}

function parseCategoryBreakdown(payload: unknown): DashboardCategoryBreakdown {
  if (!isRecord(payload)) {
    throw new DashboardApiError("Invalid dashboard category response");
  }

  const {
    category_slug: categorySlug,
    type,
    amount_minor: amountMinor,
  } = payload;

  if (
    typeof categorySlug !== "string" ||
    typeof type !== "string" ||
    !Number.isInteger(amountMinor)
  ) {
    throw new DashboardApiError("Invalid dashboard category response");
  }

  return {
    category_slug: categorySlug,
    type,
    amount_minor: amountMinor as number,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
