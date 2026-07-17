import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GET,
  PUT,
} from "@/app/api/budgets/monthly/[year]/[month]/route";

describe("monthly budget setup proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards GET year, month, and currency to the backend", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        year: 2026,
        month: 7,
        currency: "VND",
        total_budget_minor: 5000000,
        category_budgets: [],
      }),
    );

    const response = await GET(
      new NextRequest(
        "http://frontend.test/api/budgets/monthly/2026/7?currency=VND",
      ),
      { params: Promise.resolve({ year: "2026", month: "7" }) },
    );
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://backend:8010/api/v1/budgets/monthly/2026/7?currency=VND"),
      { cache: "no-store" },
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.total_budget_minor).toBe(5000000);
  });

  it("forwards PUT with the accepted category_budgets JSON body", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        year: 2026,
        month: 7,
        currency: "VND",
        total_budget_minor: 5000000,
        category_budgets: [
          {
            category_slug: "food",
            budget_minor: 2000000,
          },
        ],
      }),
    );

    const response = await PUT(
      new NextRequest("http://frontend.test/api/budgets/monthly/2026/7", {
        body: JSON.stringify({
          currency: "VND",
          total_budget_minor: 5000000,
          category_budgets: [
            {
              category_slug: "food",
              budget_minor: 2000000,
            },
          ],
          ignored_extra_field: "not forwarded",
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
      { params: Promise.resolve({ year: "2026", month: "7" }) },
    );
    const payload = await response.json();
    const forwarded = fetchMock.mock.calls[0]?.[1];

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://backend:8010/api/v1/budgets/monthly/2026/7"),
      expect.objectContaining({
        cache: "no-store",
        method: "PUT",
      }),
    );
    expect(JSON.parse(String(forwarded?.body))).toEqual({
      currency: "VND",
      total_budget_minor: 5000000,
      category_budgets: [
        {
          category_slug: "food",
          budget_minor: 2000000,
        },
      ],
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.category_budgets).toHaveLength(1);
  });

  it("preserves missing-budget and validation statuses with safe errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ detail: "monthly budget setup was not found" }, { status: 404 }),
    );

    const missingResponse = await GET(
      new NextRequest(
        "http://frontend.test/api/budgets/monthly/2026/7?currency=VND",
      ),
      { params: Promise.resolve({ year: "2026", month: "7" }) },
    );

    expect(missingResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toEqual({
      error: "No budget configured for this month.",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ detail: "backend validation detail" }, { status: 422 }),
    );

    const validationResponse = await PUT(
      new NextRequest("http://frontend.test/api/budgets/monthly/2026/7", {
        body: JSON.stringify({
          currency: "VND",
          total_budget_minor: 5000000,
          category_budgets: [],
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }),
      { params: Promise.resolve({ year: "2026", month: "7" }) },
    );

    expect(validationResponse.status).toBe(422);
    await expect(validationResponse.json()).resolves.toEqual({
      error: "Budget setup failed validation.",
    });
  });
});

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: init.status ?? 200,
  });
}
