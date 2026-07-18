import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE as clearHistory } from "@/app/api/ai/history/route";
import { DELETE as deleteTransactionRoute } from "@/app/api/transactions/[transactionId]/route";
import { GET as exportTransactions } from "@/app/api/transactions/export/route";

describe("data management proxy routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_INTERNAL_URL;
  });

  it("export proxy forwards only accepted filters through BACKEND_INTERNAL_URL", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("id,type\n1,expense\n", {
        headers: {
          "Content-Disposition":
            'attachment; filename="pocket-ledger-transactions-2026-07.csv"',
          "Content-Type": "text/csv; charset=utf-8",
        },
      }),
    );

    const response = await exportTransactions(
      new NextRequest(
        "http://frontend.test/api/transactions/export?format=csv&month=2026-07&category=food&type=expense&q=lunch&raw_user_text=hidden",
      ),
    );
    const body = await response.text();

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://backend:8010/api/v1/transactions/export?format=csv&month=2026-07&category=food&type=expense&q=lunch",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toContain(
      "pocket-ledger-transactions-2026-07.csv",
    );
    expect(body).toContain("id,type");
  });

  it("export proxy preserves 413 and 422 with safe errors", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ detail: "limit internals" }, { status: 413 }))
      .mockResolvedValueOnce(jsonResponse({ detail: "validation internals" }, { status: 422 }));

    const limitResponse = await exportTransactions(
      new NextRequest("http://frontend.test/api/transactions/export?format=csv"),
    );
    expect(limitResponse.status).toBe(413);
    await expect(limitResponse.json()).resolves.toEqual({
      error: "Export is too large. Narrow the filters and try again.",
    });

    const invalidResponse = await exportTransactions(
      new NextRequest("http://frontend.test/api/transactions/export?format=pdf"),
    );
    expect(invalidResponse.status).toBe(422);
    await expect(invalidResponse.json()).resolves.toEqual({
      error: "Export filters are invalid.",
    });
  });

  it("delete proxy forwards transaction ID and preserves duplicate/missing statuses", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({
          id: "tx-1",
          deleted: true,
          deleted_at: "2026-07-18T12:00:00Z",
          account_balance_minor: 965000,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ detail: "gone" }, { status: 404 }))
      .mockResolvedValueOnce(jsonResponse({ detail: "again" }, { status: 409 }))
      .mockResolvedValueOnce(jsonResponse({ detail: "bad" }, { status: 422 }));

    const successResponse = await deleteTransactionRoute(
      new NextRequest("http://frontend.test/api/transactions/tx-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ transactionId: "tx-1" }) },
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://backend:8010/api/v1/transactions/tx-1",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ cache: "no-store", method: "DELETE" }),
    );
    expect(successResponse.headers.get("Cache-Control")).toBe("no-store");

    await expectDeleteStatus(404, "Transaction was not found");
    await expectDeleteStatus(409, "Transaction was already deleted");
    await expectDeleteStatus(422, "Transaction ID is invalid");
  });

  it("clear-history proxy sends DELETE with no financial payload", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        deleted_draft_count: 4,
        preserved_transaction_count: 2,
        cleared: true,
      }),
    );

    const response = await clearHistory();
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://backend:8010/api/v1/ai/history"),
      expect.objectContaining({ cache: "no-store", method: "DELETE" }),
    );
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.deleted_draft_count).toBe(4);
  });

  it("normalizes internal upstream failures without exposing backend URLs", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("http://backend:8010 down"));

    const exportResponse = await exportTransactions(
      new NextRequest("http://frontend.test/api/transactions/export?format=csv"),
    );
    const deleteResponse = await deleteTransactionRoute(
      new NextRequest("http://frontend.test/api/transactions/tx-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ transactionId: "tx-1" }) },
    );
    const historyResponse = await clearHistory();

    for (const response of [exportResponse, deleteResponse, historyResponse]) {
      const payload = await response.json();
      expect(response.status).toBe(502);
      expect(String(payload.error)).not.toContain("http://backend:8010");
    }
  });
});

describe("transaction list proxy filters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_INTERNAL_URL;
  });

  it("forwards accepted list filters and omits unexpected fields", async () => {
    const { GET } = await import("@/app/api/transactions/route");
    process.env.BACKEND_INTERNAL_URL = "http://backend:8010";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        items: [],
        limit: 10,
        offset: 0,
        total: 0,
      }),
    );

    await GET(
      new NextRequest(
        "http://frontend.test/api/transactions?limit=10&offset=0&month=2026-07&category=food&type=expense&q=lunch&deleted_at=hidden",
      ),
    );

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://backend:8010/api/v1/transactions?limit=10&offset=0&month=2026-07&category=food&type=expense&q=lunch",
    );
  });
});

async function expectDeleteStatus(status: number, message: string) {
  const response = await deleteTransactionRoute(
    new NextRequest("http://frontend.test/api/transactions/tx-1", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ transactionId: "tx-1" }) },
  );
  const payload = await response.json();

  expect(response.status).toBe(status);
  expect(payload.error).toContain(message);
  expect(String(payload.error)).not.toContain("http://backend:8010");
}

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: init.status ?? 200,
  });
}
