"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchRecentTransactions } from "@/lib/transactions";
import type { TransactionListItem } from "@/lib/transactions";
import { TransactionRow } from "@/components/transaction-row";

type LoadState = "idle" | "loading" | "loaded" | "error";

type RecentTransactionsProps = {
  refreshSignal?: number;
};

export function RecentTransactions({ refreshSignal = 0 }: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("idle");

  const loadTransactions = useCallback(async () => {
    setState((current) => (current === "loaded" ? current : "loading"));
    try {
      const result = await fetchRecentTransactions();
      setTransactions(result.items);
      setTotal(result.total);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, refreshSignal]);

  const isLoading = state === "idle" || state === "loading";
  const isRefreshing = state === "loaded";

  return (
    <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-ledger-ink">
            Recent Transactions
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Latest records from the local ledger API.
          </p>
        </div>
        <button
          className="h-10 rounded-md border border-ledger-line bg-white px-4 text-sm font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void loadTransactions()}
          type="button"
        >
          {isLoading ? "Loading" : isRefreshing ? "Refresh" : "Try again"}
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-ledger-line">
        {isLoading ? <LoadingState /> : null}
        {state === "error" ? <ErrorState /> : null}
        {state === "loaded" && transactions.length === 0 ? <EmptyState /> : null}
        {state === "loaded" && transactions.length > 0 ? (
          <div>
            <ul className="divide-y divide-ledger-line">
              {transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </ul>
            <p className="border-t border-ledger-line bg-ledger-wash px-4 py-3 text-xs text-ledger-muted">
              Showing {transactions.length} of {total} matching transactions.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3 bg-white p-4">
      <p className="text-sm font-medium text-ledger-ink">
        Loading recent transactions...
      </p>
      <div className="h-3 w-3/4 rounded bg-ledger-line" />
      <div className="h-3 w-1/2 rounded bg-ledger-line" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white p-4">
      <p className="text-sm font-medium text-ledger-ink">No transactions yet.</p>
      <p className="mt-1 text-sm text-ledger-muted">
        Add your first expense from the API or the chat flow.
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="bg-white p-4">
      <p className="text-sm font-medium text-rose-700">
        Unable to load recent transactions.
      </p>
      <p className="mt-1 text-sm text-ledger-muted">
        Check that the local backend is running, then refresh this section.
      </p>
    </div>
  );
}
