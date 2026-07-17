import { NextRequest, NextResponse } from "next/server";

import { getBackendApiBaseUrl } from "@/lib/config";
import {
  parseTransactionListResponse,
  TransactionApiError,
} from "@/lib/transactions";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get("limit") ?? "10";
  const offset = searchParams.get("offset") ?? "0";
  const url = new URL("/api/v1/transactions", getBackendApiBaseUrl());
  url.searchParams.set("limit", limit);
  url.searchParams.set("offset", offset);

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to load recent transactions" },
        { status: 502 },
      );
    }

    const payload: unknown = await response.json();
    const transactions = parseTransactionListResponse(payload);
    return NextResponse.json(transactions);
  } catch (error) {
    if (error instanceof TransactionApiError) {
      return NextResponse.json(
        { error: "Invalid transaction response" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to load recent transactions" },
      { status: 502 },
    );
  }
}
