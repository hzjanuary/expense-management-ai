import { NextRequest, NextResponse } from "next/server";

import { getBackendApiBaseUrl } from "@/lib/config";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

const EXPORT_FILTERS = ["format", "month", "category", "type", "q"] as const;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL("/api/v1/transactions/export", getBackendApiBaseUrl());
  for (const key of EXPORT_FILTERS) {
    const value = request.nextUrl.searchParams.get(key);
    if (value?.trim()) {
      url.searchParams.set(key, value.trim());
    }
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: getExportErrorMessage(response.status) },
        { headers: NO_STORE_HEADERS, status: response.status },
      );
    }

    const headers = new Headers(NO_STORE_HEADERS);
    const contentType = response.headers.get("Content-Type");
    const contentDisposition = response.headers.get("Content-Disposition");
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    }

    return new Response(response.body, {
      headers,
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the local export service." },
      { headers: NO_STORE_HEADERS, status: 502 },
    );
  }
}

function getExportErrorMessage(status: number): string {
  if (status === 413) {
    return "Export is too large. Narrow the filters and try again.";
  }
  if (status === 422) {
    return "Export filters are invalid.";
  }
  return "Unable to export transactions.";
}
