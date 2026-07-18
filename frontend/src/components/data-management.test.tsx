import { cleanup, render, screen } from "@testing-library/react";
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

    expect(screen.getByLabelText("Format")).toHaveValue("csv");
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText("Format"), "json");
    await userEvent.selectOptions(screen.getByLabelText("Category"), "food");
    await userEvent.selectOptions(screen.getByLabelText("Type"), "expense");
    await userEvent.type(screen.getByLabelText("Search text"), "ăn trưa");
    await userEvent.click(screen.getByRole("button", { name: "Download export" }));

    await screen.findByText("Started JSON download.");
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

    await userEvent.click(screen.getByRole("button", { name: "Download export" }));
    expect(
      await screen.findByText(/Export is too large/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Download export" }));
    expect(await screen.findByText("Export filters are invalid.")).toBeInTheDocument();
  });

  it("blocks duplicate export downloads while pending", async () => {
    const slowExport = createDeferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(slowExport.promise);

    render(<TransactionExport month="2026-07" />);

    await userEvent.click(screen.getByRole("button", { name: "Download export" }));
    expect(
      screen.getByRole("button", { name: "Preparing download" }),
    ).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Preparing download" }));

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
    await userEvent.click(
      screen.getByRole("button", { name: /Delete transaction US-705 lunch proof/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/not permanently erased/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Delete transaction" }));

    await screen.findByText("Transaction deleted from active ledger views.");
    expect(
      fetchMock.mock.calls.filter(
        ([input, init]) =>
          String(input) === `/api/transactions/${transaction.id}` &&
          init?.method === "DELETE",
      ),
    ).toHaveLength(1);
    expect(onTransactionDeleted).toHaveBeenCalledOnce();
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
    await userEvent.click(
      screen.getByRole("button", { name: /Delete transaction US-705 lunch proof/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Delete transaction US-705 lunch proof/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete transaction" }));

    expect(await screen.findByText("Unable to delete transaction.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Delete transaction US-705 lunch proof/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete transaction" })).toBeEnabled();
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
    await userEvent.click(
      screen.getByRole("button", { name: /Delete transaction US-705 lunch proof/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete transaction" }));

    expect(
      await screen.findByText(/Transaction was already deleted/i),
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
    await userEvent.click(
      screen.getByRole("button", { name: /Delete transaction US-705 lunch proof/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete transaction" }));
    expect(screen.getByRole("button", { name: "Deleting" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Deleting" }));

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

    expect(screen.getByText(/Confirmed transactions and account balances remain unchanged/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear AI history" }));
    expect(screen.getByText(/does not clear transaction history/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Clear AI history" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "Clear AI history" }).at(-1) ??
        screen.getByRole("button", { name: "Clear AI history" }),
    );

    expect(await screen.findByText(/Cleared 4 AI draft records/i)).toBeInTheDocument();
    expect(screen.getByText(/Preserved 2 referenced ledger transactions/i)).toBeInTheDocument();
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

    await userEvent.click(screen.getByRole("button", { name: "Clear AI history" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "Clear AI history" }).at(-1) ??
        screen.getByRole("button", { name: "Clear AI history" }),
    );
    expect(screen.getByRole("button", { name: "Clearing" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Clearing" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    slowClear.resolve(
      jsonResponse({
        deleted_draft_count: 0,
        preserved_transaction_count: 0,
        cleared: true,
      }),
    );

    expect(await screen.findByText(/Cleared 0 AI draft records/i)).toBeInTheDocument();
  });

  it("shows clear-history failures safely", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "Unable to clear AI history." }, { status: 500 }),
    );

    render(<ClearAiHistory />);

    await userEvent.click(screen.getByRole("button", { name: "Clear AI history" }));
    await userEvent.click(
      screen.getAllByRole("button", { name: "Clear AI history" }).at(-1) ??
        screen.getByRole("button", { name: "Clear AI history" }),
    );

    expect(await screen.findByText("Unable to clear AI history.")).toBeInTheDocument();
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
