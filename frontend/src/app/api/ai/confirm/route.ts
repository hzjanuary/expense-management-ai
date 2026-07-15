import { NextRequest, NextResponse } from "next/server";

import { appConfig } from "@/lib/config";
import {
  AiApiError,
  getAiErrorMessageForStatus,
  parseAiConfirmResponse,
} from "@/lib/ai";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "AI draft could not be confirmed." },
      { status: 422 },
    );
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json(
      { error: "AI draft could not be confirmed." },
      { status: 422 },
    );
  }

  const requestPayload = payload as Record<string, unknown>;
  const draftId = requestPayload.draft_id;
  if (typeof draftId !== "string" || draftId.trim().length === 0) {
    return NextResponse.json(
      { error: "AI draft could not be confirmed." },
      { status: 422 },
    );
  }

  const url = new URL("/api/v1/ai/confirm", appConfig.apiBaseUrl);

  try {
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: getAiErrorMessageForStatus(response.status, "confirm") },
        { status: response.status },
      );
    }

    const backendPayload: unknown = await response.json();
    const confirmed = parseAiConfirmResponse(backendPayload);
    return NextResponse.json(confirmed);
  } catch (error) {
    if (error instanceof AiApiError) {
      return NextResponse.json(
        { error: "AI confirmation failed safely." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local backend AI confirmation endpoint." },
      { status: 502 },
    );
  }
}
