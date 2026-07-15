import { NextRequest, NextResponse } from "next/server";

import { appConfig } from "@/lib/config";
import {
  AiApiError,
  getAiErrorMessageForStatus,
  parseAiParseResponse,
} from "@/lib/ai";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Message could not be parsed." },
      { status: 422 },
    );
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json(
      { error: "Enter a message to parse." },
      { status: 422 },
    );
  }

  const requestPayload = payload as Record<string, unknown>;
  const message = requestPayload.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Enter a message to parse." },
      { status: 422 },
    );
  }

  const url = new URL("/api/v1/ai/parse", appConfig.apiBaseUrl);

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
        { error: getAiErrorMessageForStatus(response.status, "parse") },
        { status: response.status },
      );
    }

    const backendPayload: unknown = await response.json();
    const parsed = parseAiParseResponse(backendPayload);
    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof AiApiError) {
      return NextResponse.json(
        { error: "AI provider returned an invalid parse response." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local backend AI parser." },
      { status: 502 },
    );
  }
}
