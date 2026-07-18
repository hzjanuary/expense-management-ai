import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BudgetSetupForm,
  validateBudgetSetupDraft,
} from "@/components/budget-setup-form";

const configuredBudget = {
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

describe("budget setup form", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders create state when no budget is configured", async () => {
    mockBudgetSetupFetch({ missing: true });

    render(<BudgetSetupForm month="2026-07" onSaved={vi.fn()} />);

    expect(
      await screen.findByText(/Chưa thiết lập ngân sách/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Ngân sách tháng/i)).toHaveValue("");
  });

  it("prefills an existing configured budget", async () => {
    mockBudgetSetupFetch();

    render(<BudgetSetupForm month="2026-07" onSaved={vi.fn()} />);

    expect(await screen.findByDisplayValue("5000000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2000000")).toBeInTheDocument();
    expect(screen.getByLabelText("Danh mục")).toHaveValue("food");
  });

  it("does not let a stale previous-month prefill overwrite the current form", async () => {
    const july = createDeferred<Response>();
    const august = createDeferred<Response>();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/2026/7?")) {
        return july.promise;
      }
      if (url.includes("/2026/8?")) {
        return august.promise;
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    const { rerender } = render(
      <BudgetSetupForm month="2026-07" onSaved={vi.fn()} />,
    );
    rerender(<BudgetSetupForm month="2026-08" onSaved={vi.fn()} />);

    august.resolve(
      jsonResponse({
        ...configuredBudget,
        month: 8,
        total_budget_minor: 6000000,
        category_budgets: [],
      }),
    );
    expect(await screen.findByDisplayValue("6000000")).toBeInTheDocument();

    july.resolve(jsonResponse(configuredBudget));
    await waitFor(() =>
      expect(screen.queryByDisplayValue("5000000")).not.toBeInTheDocument(),
    );
  });

  it("adds and removes category rows", async () => {
    mockBudgetSetupFetch({ missing: true });

    render(<BudgetSetupForm month="2026-07" onSaved={vi.fn()} />);

    await screen.findByText(/Chưa thiết lập ngân sách/i);
    await userEvent.click(screen.getByRole("button", { name: "Thêm danh mục" }));
    expect(screen.getByLabelText("Danh mục")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /Xóa dòng ngân sách danh mục 1/i }),
    );
    expect(screen.queryByLabelText("Danh mục")).not.toBeInTheDocument();
  });

  it("submits exact integer minor-unit payload and refreshes after save", async () => {
    const onSaved = vi.fn();
    const fetchMock = mockBudgetSetupFetch({ missing: true });

    render(<BudgetSetupForm month="2026-07" onSaved={onSaved} />);

    await screen.findByText(/Chưa thiết lập ngân sách/i);
    await userEvent.type(screen.getByLabelText(/Ngân sách tháng/i), "5000000");
    await userEvent.click(screen.getByRole("button", { name: "Thêm danh mục" }));
    await userEvent.selectOptions(screen.getByLabelText("Danh mục"), "food");
    await userEvent.type(screen.getByLabelText("Ngân sách (VND)"), "2000000");
    await userEvent.click(screen.getByRole("button", { name: "Lưu ngân sách" }));

    await screen.findByText("Đã lưu ngân sách.");
    expect(onSaved).toHaveBeenCalledOnce();
    const putCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).includes("/api/budgets/monthly/2026/7") &&
        init?.method === "PUT",
    );
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      currency: "VND",
      total_budget_minor: 5000000,
      category_budgets: [
        {
          category_slug: "food",
          budget_minor: 2000000,
        },
      ],
    });
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).startsWith("/api/ai")),
    ).toBe(false);
  });

  it("disables duplicate submissions while saving", async () => {
    mockBudgetSetupFetch({ missing: true, slowPut: true });

    render(<BudgetSetupForm month="2026-07" onSaved={vi.fn()} />);

    await screen.findByText(/Chưa thiết lập ngân sách/i);
    await userEvent.type(screen.getByLabelText(/Ngân sách tháng/i), "5000000");
    await userEvent.click(screen.getByRole("button", { name: "Lưu ngân sách" }));

    expect(screen.getByRole("button", { name: "Đang lưu" })).toBeDisabled();
  });

  it("preserves entered values after backend validation failure", async () => {
    mockBudgetSetupFetch({ missing: true, putStatus: 422 });

    render(<BudgetSetupForm month="2026-07" onSaved={vi.fn()} />);

    await screen.findByText(/Chưa thiết lập ngân sách/i);
    await userEvent.type(screen.getByLabelText(/Ngân sách tháng/i), "5000000");
    await userEvent.click(screen.getByRole("button", { name: "Lưu ngân sách" }));

    expect(await screen.findByText(/Thông tin ngân sách chưa hợp lệ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ngân sách tháng/i)).toHaveValue("5000000");
  });

  it("permits resubmission after a network failure", async () => {
    const fetchMock = mockBudgetSetupFetch({ missing: true, rejectFirstPut: true });

    render(<BudgetSetupForm month="2026-07" onSaved={vi.fn()} />);

    await screen.findByText(/Chưa thiết lập ngân sách/i);
    await userEvent.type(screen.getByLabelText(/Ngân sách tháng/i), "5000000");
    await userEvent.click(screen.getByRole("button", { name: "Lưu ngân sách" }));
    expect(await screen.findByText(/Không lưu được ngân sách/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Lưu ngân sách" }));
    await screen.findByText("Đã lưu ngân sách.");
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(2);
  });

  it("validates negative, decimal, missing, duplicate, income, and over-total inputs", () => {
    expect(
      validateBudgetSetupDraft({
        currency: "VND",
        total_budget_minor: "-1",
        category_rows: [],
      }).ok,
    ).toBe(false);
    expect(
      validateBudgetSetupDraft({
        currency: "VND",
        total_budget_minor: "10.5",
        category_rows: [],
      }).ok,
    ).toBe(false);
    expect(
      validateBudgetSetupDraft({
        currency: "VND",
        total_budget_minor: "1000",
        category_rows: [
          { id: "row-1", category_slug: "", budget_minor: "100" },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateBudgetSetupDraft({
        currency: "VND",
        total_budget_minor: "1000",
        category_rows: [
          { id: "row-1", category_slug: "salary", budget_minor: "100" },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateBudgetSetupDraft({
        currency: "VND",
        total_budget_minor: "1000",
        category_rows: [
          { id: "row-1", category_slug: "food", budget_minor: "100" },
          { id: "row-2", category_slug: "food", budget_minor: "100" },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateBudgetSetupDraft({
        currency: "VND",
        total_budget_minor: "1000",
        category_rows: [
          { id: "row-1", category_slug: "food", budget_minor: "-1" },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateBudgetSetupDraft({
        currency: "VND",
        total_budget_minor: "1000",
        category_rows: [
          { id: "row-1", category_slug: "food", budget_minor: "1500" },
        ],
      }).ok,
    ).toBe(false);
  });
});

function mockBudgetSetupFetch(
  options: {
    missing?: boolean;
    putStatus?: number;
    rejectFirstPut?: boolean;
    slowPut?: boolean;
  } = {},
) {
  let rejectedPut = false;
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url.startsWith("/api/budgets/monthly/2026/7") && init?.method === "PUT") {
      if (options.slowPut) {
        return new Promise(() => {});
      }
      if (options.rejectFirstPut && !rejectedPut) {
        rejectedPut = true;
        return Promise.reject(new Error("network down"));
      }
      if (options.putStatus) {
        return Promise.resolve(
          jsonResponse({ error: "Budget setup failed validation." }, { status: options.putStatus }),
        );
      }
      return Promise.resolve(jsonResponse(configuredBudget));
    }
    if (url.startsWith("/api/budgets/monthly/2026/7")) {
      if (options.missing) {
        return Promise.resolve(
          jsonResponse(
            { error: "No budget configured for this month." },
            { status: 404 },
          ),
        );
      }
      return Promise.resolve(jsonResponse(configuredBudget));
    }
    return Promise.reject(new Error(`Unexpected URL ${url}`));
  });

  return fetchMock;
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
