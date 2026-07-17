import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/budgets/monthly/[year]/[month]/remaining/route";

describe("budget remaining proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards year, month, and currency to the backend", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        year: 2026,
        month: 7,
        currency: "VND",
        total_budget_minor: 5000000,
        total_expense_minor: 35000,
        total_remaining_minor: 4965000,
        categories: [],
      }),
    );

    const response = await GET(
      new NextRequest(
        "http://frontend.test/api/budgets/monthly/2026/7/remaining?currency=VND",
      ),
      { params: Promise.resolve({ year: "2026", month: "7" }) },
    );
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        "http://backend:8010/api/v1/budgets/monthly/2026/7/remaining?currency=VND",
      ),
      { cache: "no-store" },
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.total_remaining_minor).toBe(4965000);
  });

  it("returns a safe missing-budget response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ detail: "monthly budget setup was not found" }, { status: 404 }),
    );

    const response = await GET(
      new NextRequest(
        "http://frontend.test/api/budgets/monthly/2026/7/remaining?currency=VND",
      ),
      { params: Promise.resolve({ year: "2026", month: "7" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "No budget configured for this month." });
  });
});

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: init.status ?? 200,
  });
}
