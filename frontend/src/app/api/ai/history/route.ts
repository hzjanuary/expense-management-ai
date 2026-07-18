import { NextResponse } from "next/server";

import { getBackendApiBaseUrl } from "@/lib/config";
import {
  DataManagementApiError,
  parseClearAiHistoryResponse,
} from "@/lib/data-management";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export const dynamic = "force-dynamic";

export async function DELETE() {
  const url = new URL("/api/v1/ai/history", getBackendApiBaseUrl());

  try {
    const response = await fetch(url, {
      cache: "no-store",
      method: "DELETE",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to clear AI history." },
        { headers: NO_STORE_HEADERS, status: response.status },
      );
    }

    const payload: unknown = await response.json();
    return NextResponse.json(parseClearAiHistoryResponse(payload), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    if (error instanceof DataManagementApiError) {
      return NextResponse.json(
        { error: "Invalid AI history response." },
        { headers: NO_STORE_HEADERS, status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local AI history service." },
      { headers: NO_STORE_HEADERS, status: 502 },
    );
  }
}
