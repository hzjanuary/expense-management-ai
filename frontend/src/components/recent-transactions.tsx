"use client";

import { useCallback, useEffect, useState } from "react";

import { TransactionDeleteDialog } from "@/components/transaction-delete-dialog";
import {
  DataManagementApiError,
  deleteTransaction,
} from "@/lib/data-management";
import { fetchRecentTransactions } from "@/lib/transactions";
import type { TransactionListItem } from "@/lib/transactions";
import { TransactionRow } from "@/components/transaction-row";

type LoadState = "idle" | "loading" | "loaded" | "error";

type RecentTransactionsProps = {
  onTransactionDeleted?: () => void;
  refreshSignal?: number;
};

export function RecentTransactions({
  onTransactionDeleted,
  refreshSignal = 0,
}: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("idle");
  const [localRefreshSignal, setLocalRefreshSignal] = useState(0);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

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
  }, [loadTransactions, localRefreshSignal, refreshSignal]);

  async function handleConfirmDelete() {
    if (!transactionToDelete || isDeleting) {
      return;
    }

    const deletingId = transactionToDelete.id;
    setIsDeleting(true);
    setDeleteError(null);
    setDeleteNotice(null);

    try {
      await deleteTransaction(deletingId);
      if (transactionToDelete.id !== deletingId) {
        return;
      }
      setTransactionToDelete(null);
      setDeleteNotice("Transaction deleted from active ledger views.");
      setLocalRefreshSignal((currentValue) => currentValue + 1);
      onTransactionDeleted?.();
    } catch (caughtError) {
      const message =
        caughtError instanceof DataManagementApiError
          ? caughtError.message
          : "Unable to delete transaction.";
      if (
        caughtError instanceof DataManagementApiError &&
        (caughtError.status === 404 || caughtError.status === 409)
      ) {
        setTransactionToDelete(null);
        setDeleteNotice(message);
        setLocalRefreshSignal((currentValue) => currentValue + 1);
        onTransactionDeleted?.();
      } else {
        setDeleteError(message);
      }
    } finally {
      setIsDeleting(false);
    }
  }

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
                  onDeleteRequested={(selectedTransaction) => {
                    setDeleteNotice(null);
                    setDeleteError(null);
                    setTransactionToDelete(selectedTransaction);
                  }}
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

      {deleteNotice ? (
        <p className="mt-3 text-sm font-medium text-ledger-accent" role="status">
          {deleteNotice}
        </p>
      ) : null}

      {transactionToDelete ? (
        <TransactionDeleteDialog
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setTransactionToDelete(null);
              setDeleteError(null);
            }
          }}
          onConfirm={() => void handleConfirmDelete()}
          transaction={transactionToDelete}
        />
      ) : null}
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
