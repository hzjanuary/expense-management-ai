"use client";

import { useCallback, useEffect, useState } from "react";

import { TransactionDeleteDialog } from "@/components/transaction-delete-dialog";
import { Button, panelClassName } from "@/components/ui";
import {
  DataManagementApiError,
  deleteTransaction,
} from "@/lib/data-management";
import { fetchRecentTransactions } from "@/lib/transactions";
import type {
  TransactionListFilters,
  TransactionListItem,
} from "@/lib/transactions";
import { TransactionRow } from "@/components/transaction-row";

type LoadState = "idle" | "loading" | "loaded" | "error";

type RecentTransactionsProps = {
  filters?: TransactionListFilters;
  hideDeleteActions?: boolean;
  onTransactionDeleted?: () => void;
  refreshSignal?: number;
};

export function RecentTransactions({
  filters,
  hideDeleteActions = false,
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
      const result = await fetchRecentTransactions(filters);
      setTransactions(result.items);
      setTotal(result.total);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [filters]);

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
      setDeleteNotice("Đã xóa giao dịch khỏi các màn hình đang dùng.");
      setLocalRefreshSignal((currentValue) => currentValue + 1);
      onTransactionDeleted?.();
    } catch (caughtError) {
      const message =
        caughtError instanceof DataManagementApiError
          ? getDeleteErrorMessage(caughtError)
          : "Không xóa được giao dịch. Hãy thử lại.";
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
    <section className={panelClassName}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-ledger-ink">
            Giao dịch gần đây
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Các giao dịch mới nhất đang được lưu trên máy này.
          </p>
        </div>
        <Button
          disabled={isLoading}
          onClick={() => void loadTransactions()}
          type="button"
          variant="outline"
        >
          {isLoading ? "Đang tải" : isRefreshing ? "Làm mới" : "Thử lại"}
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-ledger-line">
        {isLoading ? <LoadingState /> : null}
        {state === "error" ? <ErrorState /> : null}
        {state === "loaded" && transactions.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters(filters)} />
        ) : null}
        {state === "loaded" && transactions.length > 0 ? (
          <div>
            <ul className="divide-y divide-ledger-line">
              {transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  onDeleteRequested={
                    hideDeleteActions
                      ? undefined
                      : (selectedTransaction) => {
                          setDeleteNotice(null);
                          setDeleteError(null);
                          setTransactionToDelete(selectedTransaction);
                        }
                  }
                  transaction={transaction}
                />
              ))}
            </ul>
            <p className="border-t border-ledger-line bg-ledger-wash px-4 py-3 text-xs text-ledger-muted">
              Đang hiển thị {transactions.length}/{total} giao dịch phù hợp.
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
        Đang tải giao dịch gần đây...
      </p>
      <div className="h-3 w-3/4 rounded bg-ledger-line" />
      <div className="h-3 w-1/2 rounded bg-ledger-line" />
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-white p-4">
      <p className="text-sm font-medium text-ledger-ink">
        {hasFilters ? "Không có giao dịch phù hợp" : "Chưa có giao dịch"}
      </p>
      <p className="mt-1 text-sm text-ledger-muted">
        {hasFilters
          ? "Thử đổi tháng, danh mục, loại giao dịch hoặc từ khóa tìm kiếm."
          : "Bạn có thể thêm giao dịch bằng Trợ lý AI."}
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="bg-white p-4">
      <p className="text-sm font-medium text-rose-700">
        Chưa tải được giao dịch.
      </p>
      <p className="mt-1 text-sm text-ledger-muted">
        Kiểm tra ứng dụng cục bộ rồi bấm Thử lại.
      </p>
    </div>
  );
}

function hasActiveFilters(filters: TransactionListFilters | undefined): boolean {
  return Boolean(filters?.category || filters?.type || filters?.q);
}

function getDeleteErrorMessage(error: DataManagementApiError): string {
  if (error.status === 409) {
    return "Giao dịch này đã được xóa trước đó. Danh sách sẽ được tải lại.";
  }
  if (error.status === 404) {
    return "Không tìm thấy giao dịch này. Danh sách sẽ được tải lại.";
  }
  if (error.status === 422) {
    return "Mã giao dịch không hợp lệ.";
  }
  return error.message || "Không xóa được giao dịch. Hãy thử lại.";
}
