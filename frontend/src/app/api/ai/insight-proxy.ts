import { NextRequest, NextResponse } from "next/server";

import {
  AiApiError,
  buildInsightRequestPayload,
  getAiErrorMessageForStatus,
  type AiQueryRequest,
} from "@/lib/ai";
import { getBackendApiBaseUrl } from "@/lib/config";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export type InsightParser<T> = (payload: unknown) => T;

export async function proxyInsightRequest<T>(
  request: NextRequest,
  backendPath: string,
  parseResponse: InsightParser<T>,
) {
  let requestPayload: Required<AiQueryRequest>;
  try {
    requestPayload = parseInsightRequest(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Insight request is invalid." },
      { headers: NO_STORE_HEADERS, status: 422 },
    );
  }

  const url = new URL(backendPath, getBackendApiBaseUrl());

  try {
    const response = await fetch(url, {
      body: JSON.stringify(requestPayload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: getAiErrorMessageForStatus(response.status, "insight") },
        { headers: NO_STORE_HEADERS, status: response.status },
      );
    }

    const backendPayload: unknown = await response.json();
    const parsed = parseResponse(backendPayload);
    return NextResponse.json(parsed, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof AiApiError) {
      return NextResponse.json(
        { error: "AI provider returned an invalid insight response." },
        { headers: NO_STORE_HEADERS, status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unable to reach the local backend AI insight service." },
      { headers: NO_STORE_HEADERS, status: 502 },
    );
  }
}

function parseInsightRequest(payload: unknown): Required<AiQueryRequest> {
  if (!isRecord(payload)) {
    throw new Error("insight request must be an object");
  }

  const { message, locale, currency, timezone } = payload;

  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("message is required");
  }

  return buildInsightRequestPayload({
    message: message.trim(),
    locale: typeof locale === "string" ? locale : undefined,
    currency: typeof currency === "string" ? currency : undefined,
    timezone: typeof timezone === "string" ? timezone : undefined,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
