import { NextRequest, NextResponse } from "next/server";

import {
  BudgetApiError,
  parseBudgetRemainingResponse,
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
    `/api/v1/budgets/monthly/${year}/${month}/remaining`,
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
        { error: "Unable to load budget status." },
        { headers: NO_STORE_HEADERS, status: response.status },
      );
    }

    const payload: unknown = await response.json();
    const remaining = parseBudgetRemainingResponse(payload);
    return NextResponse.json(remaining, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof BudgetApiError) {
      return NextResponse.json(
        { error: "Invalid budget status response." },
        { headers: NO_STORE_HEADERS, status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local budget service." },
      { headers: NO_STORE_HEADERS, status: 502 },
    );
  }
}

function isYear(value: string): boolean {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 9999;
}

function isMonth(value: string): boolean {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12;
}
