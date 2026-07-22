import { NextRequest, NextResponse } from "next/server";

import {
  AiApiError,
  getAiErrorMessageForStatus,
  parseAiCancelResponse,
} from "@/lib/ai";
import { getBackendApiBaseUrl } from "@/lib/config";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonNoStore({ error: "AI draft could not be cancelled." }, 422);
  }

  if (typeof payload !== "object" || payload === null) {
    return jsonNoStore({ error: "AI draft could not be cancelled." }, 422);
  }

  const requestPayload = payload as Record<string, unknown>;
  const draftId = requestPayload.draft_id;
  if (typeof draftId !== "string" || draftId.trim().length === 0) {
    return jsonNoStore({ error: "AI draft could not be cancelled." }, 422);
  }

  const url = new URL("/api/v1/ai/cancel", getBackendApiBaseUrl());

  try {
    const response = await fetch(url, {
      body: JSON.stringify({ draft_id: draftId }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return jsonNoStore(
        { error: getAiErrorMessageForStatus(response.status, "cancel") },
        response.status,
      );
    }

    const backendPayload: unknown = await response.json();
    return jsonNoStore(parseAiCancelResponse(backendPayload));
  } catch (error) {
    if (error instanceof AiApiError) {
      return jsonNoStore({ error: "AI cancellation failed safely." }, 502);
    }

    return jsonNoStore(
      { error: "Unable to reach the local backend AI cancellation endpoint." },
      502,
    );
  }
}

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}
