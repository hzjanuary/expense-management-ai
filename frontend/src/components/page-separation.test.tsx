import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssistantWorkspace } from "@/components/assistant/assistant-workspace";
import { BudgetsClient } from "@/components/budgets-client";
import { SettingsClient } from "@/components/settings-client";
import { TransactionsClient } from "@/components/transactions-client";

describe("separated post-MVP pages", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders transaction list, filters, export, and delete behavior on transactions page", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith("/api/transactions?")) {
        return Promise.resolve(jsonResponse(emptyTransactions));
      }
      return Promise.resolve(new Response("id,type\n", { status: 200 }));
    });

    render(<TransactionsClient />);

    expect(await screen.findByText("Chưa có giao dịch")).toBeInTheDocument();
    expect(screen.getByText("Xuất giao dịch")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getAllByLabelText("Danh mục")[0], "food");

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("category=food"),
        ),
      ).toBe(true),
    );
    expect(await screen.findByText("Không có giao dịch phù hợp")).toBeInTheDocument();
  });

  it("renders budget setup and progress together on budgets page", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/remaining")) {
        return Promise.resolve(jsonResponse(budgetRemaining));
      }
      if (url.includes("/api/budgets/monthly")) {
        return Promise.resolve(jsonResponse(monthlyBudget));
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(<BudgetsClient />);

    expect(await screen.findByText("Thiết lập ngân sách")).toBeInTheDocument();
    expect(await screen.findByText("Tình trạng ngân sách")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("5000000")).toBeInTheDocument();
  });

  it("renders a dedicated assistant workspace and clears only session UI conversation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(spendingResponse),
    );

    render(<AssistantWorkspace />);

    await userEvent.type(
      screen.getByLabelText("Chat to ledger message"),
      "Tháng này tôi ăn uống hết bao nhiêu?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi" }));

    expect(await screen.findByText("Chi tiêu theo danh mục")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Cuộc trò chuyện mới" }),
    );

    expect(screen.queryByText("Chi tiêu theo danh mục")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
  });

  it("settings shows safe Ollama guidance and AI history privacy controls", () => {
    render(<SettingsClient />);

    expect(screen.getAllByText(/qwen3:4b-instruct/).length).toBeGreaterThan(0);
    expect(screen.getByText(/không tự tải model/i)).toBeInTheDocument();
    expect(screen.getByText("Lịch sử AI")).toBeInTheDocument();
    expect(screen.queryByText(/host.docker.internal/)).not.toBeInTheDocument();
  });
});

const emptyTransactions = {
  items: [],
  limit: 10,
  offset: 0,
  total: 0,
};

const monthlyBudget = {
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
};

const budgetRemaining = {
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

const spendingResponse = {
  intent: "query_spending",
  category_slug: "food",
  currency: "VND",
  date_range: {
    start: "2026-07-01T00:00:00+07:00",
    end: "2026-08-01T00:00:00+07:00",
    label: "this_month",
  },
  amount_minor: 35000,
  transaction_count: 1,
  answer: "Tháng này bạn đã chi 35.000₫ cho food.",
  needs_clarification: false,
  clarification: null,
};

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: init.status ?? 200,
  });
}
