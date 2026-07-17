import { NextRequest, NextResponse } from "next/server";

import {
  BudgetApiError,
  parseMonthlyBudgetResponse,
  type UpsertMonthlyBudgetRequest,
} from "@/lib/budgets";
import { getBackendApiBaseUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type RouteContext = {
  params: Promise<{
    year: string;
    month: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { year, month } = await context.params;
  const currency = request.nextUrl.searchParams.get("currency") ?? "VND";

  if (!isYear(year) || !isMonth(month) || currency.trim().length === 0) {
    return NextResponse.json(
      { error: "Select a valid month and currency." },
      { headers: NO_STORE_HEADERS, status: 422 },
    );
  }

  const url = new URL(
    `/api/v1/budgets/monthly/${year}/${month}`,
    getBackendApiBaseUrl(),
  );
  url.searchParams.set("currency", currency);

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (response.status === 404) {
      return NextResponse.json(
        { error: "No budget configured for this month." },
        { headers: NO_STORE_HEADERS, status: 404 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to load budget setup." },
        { headers: NO_STORE_HEADERS, status: response.status },
      );
    }

    const payload: unknown = await response.json();
    const budget = parseMonthlyBudgetResponse(payload);
    return NextResponse.json(budget, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof BudgetApiError) {
      return NextResponse.json(
        { error: "Invalid budget setup response." },
        { headers: NO_STORE_HEADERS, status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local budget service." },
      { headers: NO_STORE_HEADERS, status: 502 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { year, month } = await context.params;
  if (!isYear(year) || !isMonth(month)) {
    return NextResponse.json(
      { error: "Select a valid month." },
      { headers: NO_STORE_HEADERS, status: 422 },
    );
  }

  let requestPayload: UpsertMonthlyBudgetRequest;
  try {
    requestPayload = parseUpsertBudgetRequest(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Budget setup request is invalid." },
      { headers: NO_STORE_HEADERS, status: 422 },
    );
  }

  const url = new URL(
    `/api/v1/budgets/monthly/${year}/${month}`,
    getBackendApiBaseUrl(),
  );

  try {
    const response = await fetch(url, {
      body: JSON.stringify(requestPayload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: getBudgetSetupError(response.status) },
        { headers: NO_STORE_HEADERS, status: response.status },
      );
    }

    const payload: unknown = await response.json();
    const budget = parseMonthlyBudgetResponse(payload);
    return NextResponse.json(budget, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof BudgetApiError) {
      return NextResponse.json(
        { error: "Invalid budget setup response." },
        { headers: NO_STORE_HEADERS, status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local budget service." },
      { headers: NO_STORE_HEADERS, status: 502 },
    );
  }
}

function parseUpsertBudgetRequest(
  payload: unknown,
): UpsertMonthlyBudgetRequest {
  if (!isRecord(payload)) {
    throw new Error("budget setup request must be an object");
  }

  const {
    currency,
    total_budget_minor: totalBudgetMinor,
    category_budgets: categoryBudgets,
  } = payload;

  if (
    typeof currency !== "string" ||
    !Number.isInteger(totalBudgetMinor) ||
    !Array.isArray(categoryBudgets)
  ) {
    throw new Error("budget setup request has invalid fields");
  }

  return {
    currency,
    total_budget_minor: totalBudgetMinor as number,
    category_budgets: categoryBudgets.map(parseCategoryBudgetRequest),
  };
}

function parseCategoryBudgetRequest(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("category budget request must be an object");
  }

  const {
    category_slug: categorySlug,
    budget_minor: budgetMinor,
  } = payload;

  if (typeof categorySlug !== "string" || !Number.isInteger(budgetMinor)) {
    throw new Error("category budget request has invalid fields");
  }

  return {
    category_slug: categorySlug,
    budget_minor: budgetMinor as number,
  };
}

function getBudgetSetupError(status: number): string {
  if (status === 422) {
    return "Budget setup failed validation.";
  }
  return "Unable to save budget setup.";
}

function isYear(value: string): boolean {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 9999;
}

function isMonth(value: string): boolean {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
