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
    await userEvent.click(screen.getByRole("button", { name: "Gửi" }));

    expect(await screen.findByText("Bản nháp giao dịch")).toBeInTheDocument();
    expectTextBefore("Hôm nay tôi tiêu 35k vào ăn trưa", "Bản nháp giao dịch");
    expect(screen.getByLabelText("Chat to ledger message")).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/parse",
      expect.objectContaining({ method: "POST" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Xác nhận" }));

    await screen.findByText(/Đã tạo giao dịch:/);
    expect(countCalls(fetchMock, "/api/ai/confirm")).toBe(1);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("routes colloquial transaction statements to parse and renders a clean draft", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/ai/parse") {
        return Promise.resolve(jsonResponse(colloquialParseResponse));
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("hôm nay tao ăn hộp cơm gà 28k");

    expect(await screen.findByText("Bản nháp giao dịch")).toBeInTheDocument();
    expectTextBefore("hôm nay tao ăn hộp cơm gà 28k", "Bản nháp giao dịch");
    expect(screen.getByText("Cơm gà")).toBeInTheDocument();
    expect(screen.getByText("Ăn uống")).toBeInTheDocument();
    expect(await findTextContaining("28.000")).toBeInTheDocument();
    expect(countExactCalls(fetchMock, "/api/ai/parse")).toBe(1);
    expect(countExactCalls(fetchMock, "/api/ai/query-spending")).toBe(0);
  });

  it("shows friendly parse clarifications without internal field names", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        intent: "create_transaction",
        draft_id: null,
        draft: null,
        needs_confirmation: true,
        confidence: "low",
        missing_fields: ["category_slug"],
        clarification: {
          message: "Khoản này thuộc danh mục nào?",
          fields: ["category_slug"],
        },
      }),
    );

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("hôm nay mua món lạ 28k");

    expect(
      (await screen.findAllByText("Khoản này thuộc danh mục nào?")).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/nhóm chi tiêu/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/intent|category_slug|amount_minor|transaction_type|occurred_at_iso/),
    ).not.toBeInTheDocument();
  });

  it("routes canonical spending, budget, and breakdown queries to their endpoints", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Tháng này tôi ăn uống hết bao nhiêu?");
    expect(await screen.findByRole("heading", { name: "Chi tiêu theo danh mục" })).toBeInTheDocument();
    expectTextBefore("Tháng này tôi ăn uống hết bao nhiêu?", "Chi tiêu theo danh mục");
    expect(await findTextContaining("35.000")).toBeInTheDocument();

    await submitMessage("Tháng này tôi đã chi tổng cộng bao nhiêu?");
    expect(await screen.findByRole("heading", { name: "Tổng chi tiêu" })).toBeInTheDocument();
    expect(await findTextContaining("155.000")).toBeInTheDocument();

    await submitMessage("Còn bao nhiêu tiền ăn tháng này?");
    expect(await screen.findByRole("heading", { name: "Ngân sách còn lại" })).toBeInTheDocument();
    expect(await findTextContaining("1.965.000")).toBeInTheDocument();

    await submitMessage("Tuần này tôi tiêu nhiều nhất vào mục nào?");
    expect(await screen.findByRole("heading", { name: "Chi nhiều nhất" })).toBeInTheDocument();
    expect(screen.getByText("63.16%")).toBeInTheDocument();

    expect(countExactCalls(fetchMock, "/api/ai/query-spending")).toBe(2);
    expect(countExactCalls(fetchMock, "/api/ai/query-budget-remaining")).toBe(1);
    expect(countExactCalls(fetchMock, "/api/ai/query-spending-breakdown")).toBe(1);
    expect(countCalls(fetchMock, "/api/ai/confirm")).toBe(0);
    expect(countCalls(fetchMock, "/api/transactions")).toBe(0);
  });

  it("routes natural total and category spending variants", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Tôi đã tiêu bao nhiêu trong tháng này?");
    expect(await screen.findByRole("heading", { name: "Tổng chi tiêu" })).toBeInTheDocument();

    await submitMessage("Tiền cà phê tháng này là bao nhiêu?");
    expect(await screen.findByRole("heading", { name: "Chi tiêu theo danh mục" })).toBeInTheDocument();

    await submitMessage("Tôi đã chi bao nhiêu tiền xăng tháng này?");
    expect(countExactCalls(fetchMock, "/api/ai/query-spending")).toBe(3);
    expect(countCalls(fetchMock, "/api/ai/parse")).toBe(0);
  });

  it("does not route analytical spending queries to transaction parsing", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Tháng này tôi ăn uống hết bao nhiêu?");

    expect(await screen.findByRole("heading", { name: "Chi tiêu theo danh mục" })).toBeInTheDocument();
    expect(countExactCalls(fetchMock, "/api/ai/query-spending")).toBe(1);
    expect(countExactCalls(fetchMock, "/api/ai/parse")).toBe(0);
  });

  it("automatic spending selection accepts total spending questions", async () => {
    mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Tháng này tôi đã chi tổng cộng bao nhiêu?");

    expect(await screen.findByRole("heading", { name: "Tổng chi tiêu" })).toBeInTheDocument();
    expect(await findTextContaining("155.000")).toBeInTheDocument();
  });

  it("routes aggregate wallet-decrease wording as a total spending query", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage(
      "Kể từ ngày đầu tiên của tháng này đến giờ, ví của tôi đã giảm bao nhiêu vì các khoản chi?",
    );

    expect(await screen.findByRole("heading", { name: "Tổng chi tiêu" })).toBeInTheDocument();
    expect(countExactCalls(fetchMock, "/api/ai/query-spending")).toBe(1);
    expect(countCalls(fetchMock, "/api/ai/parse")).toBe(0);
  });

  it("routes varied aggregate spending prompts to the spending endpoint", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    for (const prompt of [
      "Kể từ đầu tháng đến nay tôi đã chi bao nhiêu?",
      "Ví của tôi đã giảm bao nhiêu vì các khoản chi tháng này?",
      "Tổng tiền đi ra trong tháng hiện tại là bao nhiêu?",
      "Chi phí cộng dồn tháng này là bao nhiêu?",
    ]) {
      await submitMessage(prompt);
      await waitFor(() =>
        expect(
          screen.getAllByRole("heading", { name: "Tổng chi tiêu" }).length,
        ).toBeGreaterThan(0),
      );
    }

    expect(countExactCalls(fetchMock, "/api/ai/query-spending")).toBe(4);
    expect(countCalls(fetchMock, "/api/ai/parse")).toBe(0);
  });

  it("shows supported examples for unknown input without calling a financial endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await submitMessage("Bạn có khỏe không?");

    expect(await screen.findByText("Cần thêm thông tin")).toBeInTheDocument();
    expect(
      screen.getByText(/Mình chưa chắc đây có phải một giao dịch không/),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("quick actions select the intended endpoint", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Ngân sách còn lại" }));
    await userEvent.click(screen.getByRole("button", { name: "Gửi" }));

    expect(await screen.findByRole("heading", { name: "Ngân sách còn lại" })).toBeInTheDocument();
    expect(countCalls(fetchMock, "/api/ai/query-budget-remaining")).toBe(1);
  });

  it("sends on Enter and keeps newlines with Shift Enter", async () => {
    const fetchMock = mockInsightFetch();

    render(<ChatToLedger onTransactionConfirmed={vi.fn()} />);

    const input = screen.getByLabelText("Chat to ledger message");
    await userEvent.type(input, "Tháng này tôi ăn uống hết bao nhiêu?");
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    expect(input).toHaveValue("Tháng này tôi ăn uống hết bao nhiêu?\n");

    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: "Chi tiêu theo danh mục" })).toBeInTheDocument();
    expect(countCalls(fetchMock, "/api/ai/query-spending")).toBe(1);
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
    expect((await screen.findAllByText(/Chưa thiết lập ngân sách/)).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Chưa thiết lập ngân sách cho/).length).toBeGreaterThan(0);

    await submitMessage("Tuần này tôi tiêu nhiều nhất vào mục nào?");
    expect(await screen.findByText(/Chưa có khoản chi/)).toBeInTheDocument();
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
    expectTextBefore("Tháng này tôi ăn uống hết bao nhiêu?", "Cần thêm thông tin");
    expect(
      screen.queryByText(/category_slug|date_range|spending_scope|query_scope/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/nhóm chi tiêu/)).toBeInTheDocument();
    expect(screen.queryByText("0\u00a0₫")).not.toBeInTheDocument();

    await submitMessage("Tháng này tôi ăn uống hết bao nhiêu?");
    expect(
      await screen.findByText("Trợ lý chưa sẵn sàng"),
    ).toBeInTheDocument();
    expectTextBefore("Tháng này tôi ăn uống hết bao nhiêu?", "Trợ lý chưa sẵn sàng");
    expect(screen.getByLabelText("Chat to ledger message")).toHaveValue("");
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
    await userEvent.click(screen.getByRole("button", { name: "Gửi" }));
    expect(await screen.findByRole("button", { name: "Đang gửi" })).toBeDisabled();
    expect(countCalls(fetchMock, "/api/ai/query-spending")).toBe(1);

    await userEvent.clear(screen.getByLabelText("Chat to ledger message"));
    await userEvent.type(
      screen.getByLabelText("Chat to ledger message"),
      "Còn bao nhiêu tiền ăn tháng này?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi" }));

    expect(await screen.findByRole("heading", { name: "Ngân sách còn lại" })).toBeInTheDocument();
    first.resolve(jsonResponse(spendingResponse));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Chi tiêu theo danh mục" })).not.toBeInTheDocument(),
    );
  });

  it("marks old insight results stale when financial data changes and does not persist chat", async () => {
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    mockInsightFetch();

    const { rerender } = render(
      <ChatToLedger onTransactionConfirmed={vi.fn()} refreshSignal={0} />,
    );

    await submitMessage("Còn bao nhiêu tiền ăn tháng này?");
    expect(await screen.findByRole("heading", { name: "Ngân sách còn lại" })).toBeInTheDocument();

    rerender(<ChatToLedger onTransactionConfirmed={vi.fn()} refreshSignal={1} />);

    expect(
      await screen.findByText(/Số liệu đã thay đổi/),
    ).toBeInTheDocument();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});

async function submitMessage(message: string) {
  const input = screen.getByLabelText("Chat to ledger message");
  await userEvent.clear(input);
  await userEvent.type(input, message);
  await userEvent.click(screen.getByRole("button", { name: "Gửi" }));
}

function expectTextBefore(firstText: string, secondText: string) {
  const first = screen.getAllByText(firstText)[0];
  const second = screen.getAllByText(secondText)[0];
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

function mockInsightFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url === "/api/ai/query-spending") {
      const body = getRequestBody(init);
      return Promise.resolve(
        jsonResponse(
          isTotalSpendingTestMessage(body.message)
            ? totalSpendingResponse
            : spendingResponse,
        ),
      );
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

function isTotalSpendingTestMessage(message: string): boolean {
  const normalized = message
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  return (
    normalized.includes("tong") ||
    normalized.includes("trong thang nay") ||
    normalized.includes("het bao nhieu tien") ||
    normalized.includes("vi da giam") ||
    normalized.includes("cac khoan chi") ||
    normalized.includes("dau thang") ||
    normalized.includes("tien di ra") ||
    normalized.includes("chi phi cong don")
  );
}

function getRequestBody(init: RequestInit | undefined): { message: string } {
  if (typeof init?.body !== "string") {
    return { message: "" };
  }
  const parsed = JSON.parse(init.body) as { message?: unknown };
  return { message: typeof parsed.message === "string" ? parsed.message : "" };
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
  answer: "Tháng này bạn đã chi 35.000₫ cho Ăn uống.",
  needs_clarification: false,
  clarification: null,
};

const totalSpendingResponse = {
  ...spendingResponse,
  spending_scope: "total",
  category_slug: null,
  amount_minor: 155000,
  transaction_count: 4,
  answer: "Tháng này bạn đã chi tổng cộng 155.000₫.",
};

const spendingClarificationResponse = {
  intent: "query_spending",
  spending_scope: null,
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
  answer: "Tháng này bạn còn 1.965.000₫ cho Ăn uống.",
  needs_clarification: false,
  clarification: null,
};

const noBudgetResponse = {
  ...budgetResponse,
  budget_minor: null,
  remaining_minor: null,
  is_over_budget: null,
  answer: "Bạn chưa thiết lập ngân sách cho Ăn uống tháng này.",
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
  answer: "Tuần này bạn chi nhiều nhất cho Ăn uống: 180.000₫.",
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

const colloquialParseResponse = {
  ...parseResponse,
  draft_id: "draft-colloquial-1",
  draft: {
    ...parseResponse.draft,
    amount_minor: 28000,
    category_slug: "food",
    description: "Cơm gà",
    occurred_at: "2026-07-22T12:30:00+07:00",
  },
  needs_confirmation: true,
  confidence: "medium",
  clarification: {
    message: "Mình hiểu giao dịch này nhưng cần bạn xác nhận trước khi ghi sổ.",
    fields: [],
  },
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
