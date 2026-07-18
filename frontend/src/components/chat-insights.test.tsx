import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatToLedger } from "@/components/chat-to-ledger";

describe("insight chat UI", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("routes canonical transaction input to parse and keeps explicit confirmation", async () => {
    const onConfirmed = vi.fn();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/ai/parse") {
        return Promise.resolve(jsonResponse(parseResponse));
      }
      if (url === "/api/ai/confirm") {
        return Promise.resolve(jsonResponse(confirmResponse));
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(<ChatToLedger onTransactionConfirmed={onConfirmed} />);

    await userEvent.type(
      screen.getByLabelText("Chat to ledger message"),
      "Hôm nay tôi tiêu 35k vào ăn trưa",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Review AI Draft")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/parse",
      expect.objectContaining({ method: "POST" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await screen.findByText(/Transaction created:/);
    expect(countCalls(fetchMock, "/api/ai/confirm")).toBe(1);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("routes canonical spending, budget, and breakdown queries to their endpoints", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Tháng này tôi ăn uống hết bao nhiêu?");
    expect(await screen.findByText("Spending Insight")).toBeInTheDocument();
    expect(await findTextContaining("35.000")).toBeInTheDocument();

    await submitMessage("Còn bao nhiêu tiền ăn tháng này?");
    expect(await screen.findByText("Budget Insight")).toBeInTheDocument();
    expect(await findTextContaining("1.965.000")).toBeInTheDocument();

    await submitMessage("Tuần này tôi tiêu nhiều nhất vào mục nào?");
    expect(await screen.findByText("Top Spending Insight")).toBeInTheDocument();
    expect(screen.getByText("63.16%")).toBeInTheDocument();

    expect(countExactCalls(fetchMock, "/api/ai/query-spending")).toBe(1);
    expect(countExactCalls(fetchMock, "/api/ai/query-budget-remaining")).toBe(1);
    expect(countExactCalls(fetchMock, "/api/ai/query-spending-breakdown")).toBe(1);
    expect(countCalls(fetchMock, "/api/ai/confirm")).toBe(0);
    expect(countCalls(fetchMock, "/api/transactions")).toBe(0);
  });

  it("shows supported examples for unknown input without calling a financial endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Bạn có khỏe không?");

    expect(
      await screen.findByText(/I can help with transaction drafts/),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("quick actions select the intended endpoint", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Budget remaining" }));
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Budget Insight")).toBeInTheDocument();
    expect(countCalls(fetchMock, "/api/ai/query-budget-remaining")).toBe(1);
  });

  it("renders zero spending, missing budget, and empty breakdown safely", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/ai/query-spending") {
        return Promise.resolve(
          jsonResponse({
            ...spendingResponse,
            amount_minor: 0,
            transaction_count: 0,
          }),
        );
      }
      if (url === "/api/ai/query-budget-remaining") {
        return Promise.resolve(jsonResponse(noBudgetResponse));
      }
      if (url === "/api/ai/query-spending-breakdown") {
        return Promise.resolve(jsonResponse(emptyBreakdownResponse));
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Tháng này tôi ăn uống hết bao nhiêu?");
    expect(await findTextContaining("0")).toBeInTheDocument();

    await submitMessage("Còn bao nhiêu tiền ăn tháng này?");
    expect((await screen.findAllByText(/No budget configured/)).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("No configured budget").length).toBeGreaterThan(0);

    await submitMessage("Tuần này tôi tiêu nhiều nhất vào mục nào?");
    expect(await screen.findByText(/No expenses found/)).toBeInTheDocument();
  });

  it("renders clarification and provider errors without fabricated totals", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(spendingClarificationResponse))
      .mockResolvedValueOnce(
        jsonResponse(
          { error: "Local AI is disabled or unavailable." },
          { status: 503 },
        ),
      );

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Tháng này tôi ăn uống hết bao nhiêu?");
    expect(
      await screen.findByText("Bạn muốn hỏi chi tiêu cho danh mục nào?"),
    ).toBeInTheDocument();
    expect(screen.queryByText("0\u00a0₫")).not.toBeInTheDocument();

    await submitMessage("Tháng này tôi ăn uống hết bao nhiêu?");
    expect(
      await screen.findByText("Local AI is disabled or unavailable."),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tháng này tôi ăn uống hết bao nhiêu?")).toBeInTheDocument();
  });

  it("prevents duplicate submit while pending and ignores stale responses", async () => {
    const first = createDeferred<Response>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/ai/query-spending" && fetchMock.mock.calls.length === 1) {
        return first.promise;
      }
      if (url === "/api/ai/query-budget-remaining") {
        return Promise.resolve(jsonResponse(budgetResponse));
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText("Chat to ledger message"),
      "Tháng này tôi ăn uống hết bao nhiêu?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("button", { name: "Sending" })).toBeDisabled();
    expect(countCalls(fetchMock, "/api/ai/query-spending")).toBe(1);

    await userEvent.clear(screen.getByLabelText("Chat to ledger message"));
    await userEvent.type(
      screen.getByLabelText("Chat to ledger message"),
      "Còn bao nhiêu tiền ăn tháng này?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Budget Insight")).toBeInTheDocument();
    first.resolve(jsonResponse(spendingResponse));

    await waitFor(() =>
      expect(screen.queryByText("Spending Insight")).not.toBeInTheDocument(),
    );
  });

  it("marks old insight results stale when financial data changes and does not persist chat", async () => {
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    mockInsightFetch();

    const { rerender } = render(
      <ChatToLedger onTransactionConfirmed={vi.fn()} refreshSignal={0} />,
    );

    await submitMessage("Còn bao nhiêu tiền ăn tháng này?");
    expect(await screen.findByText("Budget Insight")).toBeInTheDocument();

    rerender(<ChatToLedger onTransactionConfirmed={vi.fn()} refreshSignal={1} />);

    expect(
      await screen.findByText(/Financial data changed/),
    ).toBeInTheDocument();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});

async function submitMessage(message: string) {
  const input = screen.getByLabelText("Chat to ledger message");
  await userEvent.clear(input);
  await userEvent.type(input, message);
  await userEvent.click(screen.getByRole("button", { name: "Send" }));
}

function mockInsightFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url === "/api/ai/query-spending") {
      return Promise.resolve(jsonResponse(spendingResponse));
    }
    if (url === "/api/ai/query-budget-remaining") {
      return Promise.resolve(jsonResponse(budgetResponse));
    }
    if (url === "/api/ai/query-spending-breakdown") {
      return Promise.resolve(jsonResponse(breakdownResponse));
    }
    return Promise.reject(new Error(`Unexpected URL ${url}`));
  });
}

const dateRange = {
  start: "2026-07-01T00:00:00+07:00",
  end: "2026-08-01T00:00:00+07:00",
  label: "this_month",
};

const spendingResponse = {
  intent: "query_spending",
  category_slug: "food",
  currency: "VND",
  date_range: dateRange,
  amount_minor: 35000,
  transaction_count: 1,
  answer: "Tháng này bạn đã chi 35.000₫ cho food.",
  needs_clarification: false,
  clarification: null,
};

const spendingClarificationResponse = {
  intent: "query_spending",
  category_slug: null,
  currency: "VND",
  date_range: null,
  amount_minor: null,
  transaction_count: 0,
  answer: null,
  needs_clarification: true,
  clarification: {
    message: "Bạn muốn hỏi chi tiêu cho danh mục nào?",
    fields: ["category_slug"],
  },
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
  answer: "Tháng này bạn còn 1.965.000₫ cho food.",
  needs_clarification: false,
  clarification: null,
};

const noBudgetResponse = {
  ...budgetResponse,
  budget_minor: null,
  remaining_minor: null,
  is_over_budget: null,
  answer: "Bạn chưa thiết lập ngân sách cho food tháng này.",
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
    {
      category_slug: "transport",
      amount_minor: 105000,
      transaction_count: 2,
      percentage: 36.84,
    },
  ],
  answer: "Tuần này bạn chi nhiều nhất cho food: 180.000₫.",
  needs_clarification: false,
  clarification: null,
};

const emptyBreakdownResponse = {
  ...breakdownResponse,
  total_expense_minor: 0,
  transaction_count: 0,
  top_category: null,
  breakdown: [],
  answer: "Bạn chưa có khoản chi nào trong tuần này.",
};

const parseResponse = {
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
};

const confirmResponse = {
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
};

function countCalls(
  fetchMock: { mock: { calls: unknown[][] } },
  path: string,
): number {
  return fetchMock.mock.calls.filter((call: unknown[]) =>
    String(call[0]).includes(path),
  ).length;
}

function countExactCalls(
  fetchMock: { mock: { calls: unknown[][] } },
  path: string,
): number {
  return fetchMock.mock.calls.filter((call: unknown[]) => String(call[0]) === path)
    .length;
}

async function findTextContaining(text: string): Promise<HTMLElement> {
  const matches = await screen.findAllByText((_, element) =>
    Boolean(
      element?.textContent?.includes(text) &&
        Array.from(element.children).every(
          (child) => !child.textContent?.includes(text),
        ),
    ),
  );
  return matches[0];
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
