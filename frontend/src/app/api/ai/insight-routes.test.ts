import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as queryBudgetRemaining } from "@/app/api/ai/query-budget-remaining/route";
import { POST as querySpending } from "@/app/api/ai/query-spending/route";
import { POST as querySpendingBreakdown } from "@/app/api/ai/query-spending-breakdown/route";
import { POST as cancelDraft } from "@/app/api/ai/cancel/route";

describe("AI insight proxy routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_INTERNAL_URL;
  });

  it("forwards accepted fields only through BACKEND_INTERNAL_URL with no-store", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(spendingResponse));

    const response = await querySpending(
      request("http://frontend.test/api/ai/query-spending", {
        message: "Tháng này tôi ăn uống hết bao nhiêu?",
        locale: "vi-VN",
        currency: "VND",
        timezone: "Asia/Ho_Chi_Minh",
        raw_user_text: "must not forward",
      }),
    );

    const forwarded = fetchMock.mock.calls[0]?.[1];
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://backend:8010/api/v1/ai/query-spending"),
      expect.objectContaining({
        cache: "no-store",
        method: "POST",
      }),
    );
    expect(JSON.parse(String(forwarded?.body))).toEqual({
      message: "Tháng này tôi ăn uống hết bao nhiêu?",
      locale: "vi-VN",
      currency: "VND",
      timezone: "Asia/Ho_Chi_Minh",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("routes budget remaining and breakdown to their backend endpoints", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(budgetResponse))
      .mockResolvedValueOnce(jsonResponse(breakdownResponse));

    await queryBudgetRemaining(
      request("http://frontend.test/api/ai/query-budget-remaining", {
        message: "Còn bao nhiêu tiền ăn tháng này?",
      }),
    );
    await querySpendingBreakdown(
      request("http://frontend.test/api/ai/query-spending-breakdown", {
        message: "Tuần này tôi tiêu nhiều nhất vào mục nào?",
      }),
    );

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://backend:8010/api/v1/ai/query-budget-remaining",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "http://backend:8010/api/v1/ai/query-spending-breakdown",
    );
  });

  it("preserves provider and validation statuses with safe errors", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({ detail: "backend unavailable details" }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ detail: "backend timeout details" }, { status: 504 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ detail: "backend invalid details" }, { status: 502 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ detail: "backend validation details" }, { status: 422 }),
      );

    await expectStatusAndSafeError(querySpending, 503);
    await expectStatusAndSafeError(querySpending, 504);
    await expectStatusAndSafeError(querySpending, 502);
    await expectStatusAndSafeError(querySpending, 422);
  });

  it("rejects malformed JSON and invalid backend response safely", async () => {
    const malformedResponse = await querySpending(
      new NextRequest("http://frontend.test/api/ai/query-spending", {
        body: "{",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(malformedResponse.status).toBe(422);
    await expect(malformedResponse.json()).resolves.toEqual({
      error: "Insight request is invalid.",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ nope: true }));

    const invalidResponse = await querySpending(
      request("http://frontend.test/api/ai/query-spending", {
        message: "Tháng này tôi ăn uống hết bao nhiêu?",
      }),
    );

    expect(invalidResponse.status).toBe(502);
    await expect(invalidResponse.json()).resolves.toEqual({
      error: "AI provider returned an invalid insight response.",
    });
  });

  it("cancel proxy forwards only draft ID and preserves safe statuses", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({
          draft_id: "draft-1",
          status: "cancelled",
          cancelled: true,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ detail: "missing" }, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ detail: "confirmed" }, { status: 422 }));

    const success = await cancelDraft(
      request("http://frontend.test/api/ai/cancel", {
        draft_id: "draft-1",
        raw_user_text: "must not forward",
      }),
    );
    const forwarded = fetchMock.mock.calls[0]?.[1];

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://backend:8010/api/v1/ai/cancel",
    );
    expect(JSON.parse(String(forwarded?.body))).toEqual({
      draft_id: "draft-1",
    });
    expect(success.status).toBe(200);
    expect(success.headers.get("Cache-Control")).toBe("no-store");

    const missing = await cancelDraft(
      request("http://frontend.test/api/ai/cancel", { draft_id: "missing" }),
    );
    const invalid = await cancelDraft(
      request("http://frontend.test/api/ai/cancel", { draft_id: "confirmed" }),
    );

    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({
      error: "AI draft was not found. Parse the message again before cancelling.",
    });
    expect(invalid.status).toBe(422);
    await expect(invalid.json()).resolves.toEqual({
      error: "AI draft could not be cancelled. It may already be confirmed or expired.",
    });
  });
});

async function expectStatusAndSafeError(
  route: (request: NextRequest) => Promise<Response>,
  status: number,
) {
  const response = await route(
    request("http://frontend.test/api/ai/query-spending", {
      message: "Tháng này tôi ăn uống hết bao nhiêu?",
    }),
  );
  const payload = await response.json();

  expect(response.status).toBe(status);
  expect(String(payload.error)).not.toContain("backend");
  expect(String(payload.error)).not.toContain("http://backend:8010");
}

function request(url: string, payload: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

const dateRange = {
  start: "2026-07-01T00:00:00+07:00",
  end: "2026-08-01T00:00:00+07:00",
  label: "this_month",
};

const spendingResponse = {
  intent: "query_spending",
  spending_scope: "category",
  category_slug: "food",
  currency: "VND",
  date_range: dateRange,
  amount_minor: 35000,
  transaction_count: 1,
  answer: "Tháng này bạn đã chi 35.000 ₫ cho Ăn uống.",
  needs_clarification: false,
  clarification: null,
};

const budgetResponse = {
  intent: "budget_remaining",
  category_slug: "food",
  currency: "VND",
  date_range: dateRange,
  budget_minor: 2000000,
  spent_minor: 35000,
  remaining_minor: 1965000,
  is_over_budget: false,
  transaction_count: 1,
  answer: "Tháng này bạn còn 1.965.000 ₫ cho Ăn uống.",
  needs_clarification: false,
  clarification: null,
};

const breakdownResponse = {
  intent: "spending_breakdown",
  currency: "VND",
  date_range: {
    start: "2026-07-13T00:00:00+07:00",
    end: "2026-07-20T00:00:00+07:00",
    label: "this_week",
  },
  total_expense_minor: 285000,
  transaction_count: 5,
  top_category: {
    category_slug: "food",
    amount_minor: 180000,
    transaction_count: 3,
    percentage: 63.16,
  },
  breakdown: [
    {
      category_slug: "food",
      amount_minor: 180000,
      transaction_count: 3,
      percentage: 63.16,
    },
  ],
  answer: "Tuần này bạn chi nhiều nhất cho nhóm Ăn uống: 180.000 ₫.",
  needs_clarification: false,
  clarification: null,
};

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: init.status ?? 200,
  });
}
