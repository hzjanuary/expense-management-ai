import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClearAiHistory } from "@/components/clear-ai-history";
import { RecentTransactions } from "@/components/recent-transactions";
import { TransactionExport } from "@/components/transaction-export";

const transaction = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "expense",
  amount_minor: 35000,
  currency: "VND",
  category_slug: "food",
  description: "US-705 lunch proof",
  merchant: null,
  occurred_at: "2026-07-17T12:00:00+07:00",
  source: "manual",
};

const incomeTransaction = {
  ...transaction,
  id: "22222222-2222-4222-8222-222222222222",
  type: "income",
  amount_minor: 5000000,
  category_slug: "salary",
  description: "Lương tháng 7",
};

const transactionList = {
  items: [transaction],
  limit: 10,
  offset: 0,
  total: 1,
};

describe("data management UI", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:export"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("builds explicit export downloads, omits empty filters, and revokes object URLs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("id,type\n1,expense\n", {
        headers: {
          "Content-Disposition":
            'attachment; filename="pocket-ledger-transactions-2026-07.csv"',
          "Content-Type": "text/csv; charset=utf-8",
        },
      }),
    );

    render(<TransactionExport month="2026-07" />);

    await openExportOptions();
    expect(screen.getByLabelText("Định dạng")).toHaveValue("csv");
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText("Định dạng"), "json");
    await userEvent.selectOptions(screen.getByLabelText("Danh mục"), "food");
    await userEvent.selectOptions(screen.getByLabelText("Loại"), "expense");
    await userEvent.type(screen.getByLabelText("Tìm kiếm"), "ăn trưa");
    await userEvent.click(screen.getByRole("button", { name: "Tải xuống" }));

    await screen.findByText("Đã bắt đầu tải file JSON.");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transactions/export?format=json&month=2026-07&category=food&type=expense&q=%C4%83n+tr%C6%B0a",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });

  it("renders export row-limit and invalid-filter errors safely", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse(
          { error: "Export is too large. Narrow the filters and try again." },
          { status: 413 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: "Export filters are invalid." }, { status: 422 }),
      );

    render(<TransactionExport month="2026-07" />);

    await openExportOptions();
    await userEvent.click(screen.getByRole("button", { name: "Tải xuống" }));
    expect(
      await screen.findByText(/File xuất quá lớn/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tải xuống" }));
    expect(await screen.findByText("Bộ lọc xuất dữ liệu chưa hợp lệ.")).toBeInTheDocument();
  });

  it("blocks duplicate export downloads while pending", async () => {
    const slowExport = createDeferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(slowExport.promise);

    render(<TransactionExport month="2026-07" />);

    await openExportOptions();
    await userEvent.click(screen.getByRole("button", { name: "Tải xuống" }));
    expect(
      screen.getByRole("button", { name: "Đang chuẩn bị" }),
    ).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Đang chuẩn bị" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("soft-deletes only after confirmation and refreshes after success", async () => {
    const onTransactionDeleted = vi.fn();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "/api/transactions?limit=10&offset=0") {
        return Promise.resolve(jsonResponse(transactionList));
      }
      if (
        url === `/api/transactions/${transaction.id}` &&
        init?.method === "DELETE"
      ) {
        return Promise.resolve(
          jsonResponse({
            id: transaction.id,
            deleted: true,
            deleted_at: "2026-07-18T12:00:00+07:00",
            account_balance_minor: 965000,
          }),
        );
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(
      <RecentTransactions
        onTransactionDeleted={onTransactionDeleted}
        refreshSignal={0}
      />,
    );

    expect(await screen.findByText("US-705 lunch proof")).toBeInTheDocument();
    expect(await findTextContaining("−35.000 ₫")).toBeInTheDocument();
    expectNoLegacyMoneyText();
    await openDeleteDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/không bị xóa vĩnh viễn/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Xóa giao dịch" }));

    await screen.findByText("Đã xóa giao dịch khỏi các màn hình đang dùng.");
    expect(
      fetchMock.mock.calls.filter(
        ([input, init]) =>
          String(input) === `/api/transactions/${transaction.id}` &&
          init?.method === "DELETE",
      ),
    ).toHaveLength(1);
    expect(onTransactionDeleted).toHaveBeenCalledOnce();
  });

  it("keeps the newest transaction-list response when an older request resolves later", async () => {
    const monthA = createDeferred<Response>();
    const monthB = createDeferred<Response>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("month=2026-06")) {
        return monthA.promise;
      }
      if (url.includes("month=2026-07")) {
        return monthB.promise;
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    const { rerender } = render(
      <RecentTransactions
        filters={{ month: "2026-06" }}
        refreshSignal={0}
      />,
    );
    rerender(
      <RecentTransactions
        filters={{ month: "2026-07" }}
        refreshSignal={0}
      />,
    );

    monthB.resolve(
      jsonResponse({
        items: [{ ...transaction, description: "Tháng B" }],
        limit: 10,
        offset: 0,
        total: 1,
      }),
    );
    expect(await screen.findByText("Tháng B")).toBeInTheDocument();

    monthA.resolve(
      jsonResponse({
        items: [{ ...transaction, description: "Tháng A" }],
        limit: 10,
        offset: 0,
        total: 1,
      }),
    );

    await waitFor(() => expect(screen.queryByText("Tháng A")).not.toBeInTheDocument());
    expect(screen.getByText("Tháng B")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts the transaction-list request on unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    const slowList = createDeferred<Response>();
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      capturedSignal = init?.signal ?? undefined;
      return slowList.promise;
    });

    const { unmount } = render(<RecentTransactions refreshSignal={0} />);
    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("shows Vietnamese labels for income categories and income export filters", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/transactions?limit=10&offset=0") {
        return Promise.resolve(
          jsonResponse({
            items: [incomeTransaction],
            limit: 10,
            offset: 0,
            total: 1,
          }),
        );
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(
      <>
        <RecentTransactions refreshSignal={0} />
        <TransactionExport month="2026-07" />
      </>,
    );

    expect(await screen.findByText("Lương tháng 7")).toBeInTheDocument();
    expect(screen.getByText("Lương")).toBeInTheDocument();
    expect(await findTextContaining("+5.000.000 ₫")).toBeInTheDocument();
    await openExportOptions();
    await userEvent.selectOptions(screen.getByLabelText("Loại"), "income");
    const categorySelect = screen.getByLabelText("Danh mục");
    expect(categorySelect).toHaveTextContent("Lương");
    expect(categorySelect).toHaveTextContent("Thưởng");
    expect(categorySelect).toHaveTextContent("Quà tặng");
    expect(categorySelect).toHaveTextContent("Thu nhập khác");
  });

  it("supports keyboard interaction for overflow menu and delete dialog focus", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/transactions?limit=10&offset=0") {
        return Promise.resolve(jsonResponse(transactionList));
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(<RecentTransactions refreshSignal={0} />);

    const trigger = await screen.findByRole("button", {
      name: /Mở menu giao dịch US-705 lunch proof/i,
    });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const menuItem = await screen.findByRole("menuitem", {
      name: "Xóa giao dịch",
    });
    await waitFor(() => expect(menuItem).toHaveFocus());

    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Hủy" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("cancelled soft-delete and network failures preserve the row", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "/api/transactions?limit=10&offset=0") {
        return Promise.resolve(jsonResponse(transactionList));
      }
      if (init?.method === "DELETE") {
        return Promise.reject(new Error("network down"));
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(<RecentTransactions refreshSignal={0} />);

    expect(await screen.findByText("US-705 lunch proof")).toBeInTheDocument();
    await openDeleteDialog();
    await userEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await openDeleteDialog();
    await userEvent.click(screen.getByRole("button", { name: "Xóa giao dịch" }));

    expect(await screen.findByText("Không xóa được giao dịch. Hãy thử lại.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Mở menu giao dịch US-705 lunch proof/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa giao dịch" })).toBeEnabled();
  });

  it("shows duplicate and missing transaction delete outcomes safely", async () => {
    const onTransactionDeleted = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "/api/transactions?limit=10&offset=0") {
        return Promise.resolve(jsonResponse(transactionList));
      }
      if (init?.method === "DELETE") {
        return Promise.resolve(
          jsonResponse(
            { error: "Transaction was already deleted. Refreshing the list is safe." },
            { status: 409 },
          ),
        );
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(
      <RecentTransactions
        onTransactionDeleted={onTransactionDeleted}
        refreshSignal={0}
      />,
    );

    expect(await screen.findByText("US-705 lunch proof")).toBeInTheDocument();
    await openDeleteDialog();
    await userEvent.click(screen.getByRole("button", { name: "Xóa giao dịch" }));

    expect(
      await screen.findByText(/Giao dịch này đã được xóa trước đó/i),
    ).toBeInTheDocument();
    expect(onTransactionDeleted).toHaveBeenCalledOnce();
  });

  it("prevents duplicate delete confirmation while pending", async () => {
    const slowDelete = createDeferred<Response>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "/api/transactions?limit=10&offset=0") {
        return Promise.resolve(jsonResponse(transactionList));
      }
      if (init?.method === "DELETE") {
        return slowDelete.promise;
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });

    render(<RecentTransactions refreshSignal={0} />);

    expect(await screen.findByText("US-705 lunch proof")).toBeInTheDocument();
    await openDeleteDialog();
    await userEvent.click(screen.getByRole("button", { name: "Xóa giao dịch" }));
    expect(screen.getByRole("button", { name: "Đang xóa" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Đang xóa" }));

    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(1);
  });

  it("clears AI history only after confirmation and reports preserved ledger counts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        deleted_draft_count: 4,
        preserved_transaction_count: 2,
        cleared: true,
      }),
    );

    render(<ClearAiHistory />);

    expect(screen.getByText(/Giao dịch đã xác nhận, số dư và ngân sách vẫn được giữ nguyên/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Xóa lịch sử AI" }));
    expect(screen.getByText(/không xóa lịch sử giao dịch/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Xóa lịch sử AI" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "Xóa lịch sử AI" }).at(-1) ??
        screen.getByRole("button", { name: "Xóa lịch sử AI" }),
    );

    expect(await screen.findByText(/Đã xóa 4 bản ghi lịch sử AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã giữ nguyên 2 giao dịch đã xác nhận/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/history",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/ai/parse",
      expect.anything(),
    );
  });

  it("treats empty AI history as success and blocks duplicate clearing", async () => {
    const slowClear = createDeferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(slowClear.promise)
      .mockResolvedValueOnce(
        jsonResponse({
          deleted_draft_count: 0,
          preserved_transaction_count: 0,
          cleared: true,
        }),
      );

    render(<ClearAiHistory />);

    await userEvent.click(screen.getByRole("button", { name: "Xóa lịch sử AI" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "Xóa lịch sử AI" }).at(-1) ??
        screen.getByRole("button", { name: "Xóa lịch sử AI" }),
    );
    expect(screen.getByRole("button", { name: "Đang xóa" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Đang xóa" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    slowClear.resolve(
      jsonResponse({
        deleted_draft_count: 0,
        preserved_transaction_count: 0,
        cleared: true,
      }),
    );

    expect(await screen.findByText(/Đã xóa 0 bản ghi lịch sử AI/i)).toBeInTheDocument();
  });

  it("shows clear-history failures safely", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "Unable to clear AI history." }, { status: 500 }),
    );

    render(<ClearAiHistory />);

    await userEvent.click(screen.getByRole("button", { name: "Xóa lịch sử AI" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "Xóa lịch sử AI" }).at(-1) ??
        screen.getByRole("button", { name: "Xóa lịch sử AI" }),
    );

    expect(await screen.findByText("Không xóa được lịch sử AI. Hãy thử lại.")).toBeInTheDocument();
  });
});

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

async function openExportOptions() {
  await userEvent.click(screen.getByRole("button", { name: "Xuất dữ liệu" }));
}

async function openDeleteDialog() {
  await userEvent.click(
    screen.getByRole("button", { name: /Mở menu giao dịch US-705 lunch proof/i }),
  );
  await userEvent.click(screen.getByRole("menuitem", { name: "Xóa giao dịch" }));
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

function expectNoLegacyMoneyText() {
  const text = document.body.textContent ?? "";
  expect(text).not.toMatch(/\d[\d.]*\s*đ\b/i);
  expect(text).not.toMatch(/\d[\d.]*\s*VND\b/i);
  expect(text).not.toMatch(/\d[\d.]*₫/);
}
