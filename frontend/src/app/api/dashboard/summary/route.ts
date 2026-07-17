import { NextRequest, NextResponse } from "next/server";

import { getBackendApiBaseUrl } from "@/lib/config";
import {
  DashboardApiError,
  isMonthValue,
  parseDashboardSummaryResponse,
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");

  if (!month || !isMonthValue(month)) {
    return NextResponse.json(
      { error: "Select a valid month." },
      { headers: NO_STORE_HEADERS, status: 422 },
    );
  }

  const url = new URL("/api/v1/dashboard/summary", getBackendApiBaseUrl());
  url.searchParams.set("month", month);

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to load dashboard summary." },
        { headers: NO_STORE_HEADERS, status: response.status },
      );
    }

    const payload: unknown = await response.json();
    const summary = parseDashboardSummaryResponse(payload);
    return NextResponse.json(summary, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof DashboardApiError) {
      return NextResponse.json(
        { error: "Invalid dashboard summary response." },
        { headers: NO_STORE_HEADERS, status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local dashboard service." },
      { headers: NO_STORE_HEADERS, status: 502 },
    );
  }
}
