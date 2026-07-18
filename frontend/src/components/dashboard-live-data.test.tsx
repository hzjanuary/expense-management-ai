import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardClient } from "@/components/dashboard-client";
import { DashboardSummary } from "@/components/dashboard-summary";
import { formatVnd } from "@/lib/money";

const summaryResponse = {
  currency: "VND",
  total_balance_minor: 965000,
  monthly_income_minor: 10000000,
  monthly_expense_minor: 35000,
  category_breakdown: [
    {
      category_slug: "food",
      type: "expense",
      amount_minor: 35000,
    },
  ],
};

const budgetResponse = {
  year: 2026,
  month: 7,
  currency: "VND",
  total_budget_minor: 5000000,
  total_expense_minor: 35000,
  total_remaining_minor: 4965000,
  categories: [
    {
      category_slug: "food",
      budget_minor: 2000000,
      spent_minor: 35000,
      remaining_minor: 1965000,
      is_over_budget: false,
    },
  ],
};

const emptyTransactions = {
  items: [],
  limit: 10,
  offset: 0,
  total: 0,
};

describe("live dashboard data", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders live summary and configured budget values", async () => {
    mockDashboardFetch();

    render(<DashboardClient />);

    expect(await findExactText("965.000\u00a0₫")).toBeInTheDocument();
    expect(await findExactText("10.000.000\u00a0₫")).toBeInTheDocument();
    expect(screen.getAllByText(/35\.000/).length).toBeGreaterThan(0);
    expect(await findExactText("5.000.000\u00a0₫")).toBeInTheDocument();
    expect(await findExactText("1.965.000\u00a0₫")).toBeInTheDocument();
    expect(screen.getByText("Within budget")).toBeInTheDocument();
  });

  it("does not show fake zero values while the summary is loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));

    render(<DashboardSummary month="2026-07" refreshSignal={0} />);

    expect(screen.getAllByText(/Loading 2026-07 summary/i)).toHaveLength(4);
    expect(screen.queryByText(formatVnd(0))).not.toBeInTheDocument();
  });

  it("renders a missing-budget empty state without crashing the dashboard", async () => {
    mockDashboardFetch({ budgetStatus: 404 });

    render(<DashboardClient />);

    expect(await findExactText("965.000\u00a0₫")).toBeInTheDocument();
    expect(
      await screen.findByText("No budget configured for this month."),
    ).toBeInTheDocument();
  });

  it("fetches the newly selected month when the month input changes", async () => {
    const fetchMock = mockDashboardFetch();

    render(<DashboardClient />);

    await findExactText("965.000\u00a0₫");
    fireEvent.change(screen.getByLabelText("Selected month"), {
      target: { value: "2026-08" },
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("/api/dashboard/summary?month=2026-08"),
        ),
      ).toBe(true);
    });
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/api/budgets/monthly/2026/8/remaining"),
      ),
    ).toBe(true);
  });

  it("does not let an older month response overwrite the latest month", async () => {
    const july = createDeferred<Response>();
    const august = createDeferred<Response>();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("2026-07")) {
        return july.promise;
      }
      if (url.includes("2026-08")) {
        return august.promise;
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    const { rerender } = render(
      <DashboardSummary month="2026-07" refreshSignal={0} />,
    );
    rerender(<DashboardSummary month="2026-08" refreshSignal={0} />);

    august.resolve(jsonResponse({ ...summaryResponse, total_balance_minor: 222000 }));
    expect(await findExactText("222.000\u00a0₫")).toBeInTheDocument();

    july.resolve(jsonResponse({ ...summaryResponse, total_balance_minor: 111000 }));
    await waitFor(() =>
      expect(screen.queryByText("111.000\u00a0₫")).not.toBeInTheDocument(),
    );
  });

  it("refreshes summary, budget, and recent transactions after AI confirmation", async () => {
    const fetchMock = mockDashboardFetch();

    render(<DashboardClient />);

    await findExactText("965.000\u00a0₫");
    await userEvent.type(
      screen.getByLabelText("Chat to ledger message"),
      "Hôm nay tôi tiêu 35k vào ăn trưa",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Review AI Draft")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/Transaction created:/)).toBeInTheDocument();

    await waitFor(() => {
      expect(countCalls(fetchMock, "/api/dashboard/summary")).toBeGreaterThan(1);
      expect(countCalls(fetchMock, "/api/budgets/monthly")).toBeGreaterThan(1);
      expect(countCalls(fetchMock, "/api/transactions")).toBeGreaterThan(1);
    });
  });
});

function mockDashboardFetch(options: { budgetStatus?: number } = {}) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.startsWith("/api/dashboard/summary")) {
      return Promise.resolve(jsonResponse(summaryResponse));
    }
    if (url.startsWith("/api/budgets/monthly")) {
      if (options.budgetStatus === 404) {
        return Promise.resolve(
          jsonResponse(
            { error: "No budget configured for this month." },
            { status: 404 },
          ),
        );
      }
      return Promise.resolve(jsonResponse(budgetResponse));
    }
    if (url.startsWith("/api/transactions")) {
      return Promise.resolve(jsonResponse(emptyTransactions));
    }
    if (url.startsWith("/api/ai/parse")) {
      return Promise.resolve(
        jsonResponse({
          intent: "create_transaction",
          draft_id: "draft-1",
          draft: {
            type: "expense",
            amount_minor: 35000,
            currency: "VND",
            category_slug: "food",
            description: "ăn trưa",
            merchant: null,
            occurred_at: null,
            source: "ai_chat",
          },
          needs_confirmation: false,
          confidence: "high",
          missing_fields: [],
          clarification: null,
        }),
      );
    }
    if (url.startsWith("/api/ai/confirm")) {
      return Promise.resolve(
        jsonResponse({
          transaction: {
            id: "tx-1",
            type: "expense",
            amount_minor: 35000,
            currency: "VND",
            category_slug: "food",
            description: "ăn trưa",
            merchant: null,
            occurred_at: "2026-07-17T12:00:00+07:00",
            source: "ai_chat",
          },
          account_balance_minor: 965000,
        }),
      );
    }

    return Promise.reject(new Error(`Unexpected URL ${url}`));
  });

  return fetchMock;
}

function countCalls(
  fetchMock: { mock: { calls: unknown[][] } },
  path: string,
): number {
  return fetchMock.mock.calls.filter((call: unknown[]) =>
    String(call[0]).includes(path),
  ).length;
}

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: init.status ?? 200,
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

async function findExactText(text: string): Promise<HTMLElement> {
  return screen.findByText((_, element) => element?.textContent === text);
}
