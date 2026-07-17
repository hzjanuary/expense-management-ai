import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/dashboard/summary/route";

describe("dashboard summary proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards the selected month to the backend with no-store responses", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        currency: "VND",
        total_balance_minor: 965000,
        monthly_income_minor: 10000000,
        monthly_expense_minor: 35000,
        category_breakdown: [],
      }),
    );

    const response = await GET(
      new NextRequest("http://frontend.test/api/dashboard/summary?month=2026-07"),
    );
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://backend:8010/api/v1/dashboard/summary?month=2026-07"),
      { cache: "no-store" },
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.total_balance_minor).toBe(965000);
  });

  it("maps backend errors to safe responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ detail: "internal backend detail" }, { status: 500 }),
    );

    const response = await GET(
      new NextRequest("http://frontend.test/api/dashboard/summary?month=2026-07"),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: "Unable to load dashboard summary." });
  });
});

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: init.status ?? 200,
  });
}
