import { NextRequest, NextResponse } from "next/server";

import { getBackendApiBaseUrl } from "@/lib/config";
import {
  DataManagementApiError,
  parseSoftDeleteTransactionResponse,
} from "@/lib/data-management";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type RouteContext = {
  params: Promise<{
    transactionId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { transactionId } = await context.params;
  const trimmedId = transactionId.trim();

  if (!trimmedId) {
    return NextResponse.json(
      { error: "Transaction ID is required." },
      { headers: NO_STORE_HEADERS, status: 422 },
    );
  }

  const url = new URL(
    `/api/v1/transactions/${encodeURIComponent(trimmedId)}`,
    getBackendApiBaseUrl(),
  );

  try {
    const response = await fetch(url, {
      cache: "no-store",
      method: "DELETE",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: getDeleteErrorMessage(response.status) },
        { headers: NO_STORE_HEADERS, status: response.status },
      );
    }

    const payload: unknown = await response.json();
    return NextResponse.json(parseSoftDeleteTransactionResponse(payload), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    if (error instanceof DataManagementApiError) {
      return NextResponse.json(
        { error: "Invalid delete response." },
        { headers: NO_STORE_HEADERS, status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local transaction service." },
      { headers: NO_STORE_HEADERS, status: 502 },
    );
  }
}

function getDeleteErrorMessage(status: number): string {
  if (status === 404) {
    return "Transaction was not found. Refresh the list and try again.";
  }
  if (status === 409) {
    return "Transaction was already deleted. Refreshing the list is safe.";
  }
  if (status === 422) {
    return "Transaction ID is invalid.";
  }
  return "Unable to delete transaction.";
}
