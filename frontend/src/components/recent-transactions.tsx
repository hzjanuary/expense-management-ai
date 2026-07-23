"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  description?: string;
  filters?: TransactionListFilters;
  hideDeleteActions?: boolean;
  hideRefreshAction?: boolean;
  onClearFilters?: () => void;
  onTransactionDeleted?: () => void;
  presentation?: "ledger" | "panel";
  refreshSignal?: number;
  title?: string;
};

export function RecentTransactions({
  description = "Các giao dịch mới nhất đang được lưu trên máy này.",
  filters,
  hideDeleteActions = false,
  hideRefreshAction = false,
  onClearFilters,
  onTransactionDeleted,
  presentation = "panel",
  refreshSignal = 0,
  title = "Giao dịch gần đây",
}: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("idle");
  const [localRefreshSignal, setLocalRefreshSignal] = useState(0);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionListItem | null>(null);
  const returnFocusAfterDeleteRef = useRef<(() => void) | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadTransactions = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setState((current) => (current === "loaded" ? current : "loading"));
    try {
      const result = await fetchRecentTransactions(filters, controller.signal);
      if (requestSequenceRef.current !== requestSequence) {
        return;
      }
      setTransactions(result.items);
      setTotal(result.total);
      setState("loaded");
    } catch (caughtError) {
      if (isAbortError(caughtError)) {
        return;
      }
      if (requestSequenceRef.current !== requestSequence) {
        return;
      }
      setState("error");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [filters]);

  useEffect(() => {
    void loadTransactions();
    return () => abortControllerRef.current?.abort();
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
      returnFocusAfterDeleteRef.current?.();
      returnFocusAfterDeleteRef.current = null;
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
        returnFocusAfterDeleteRef.current?.();
        returnFocusAfterDeleteRef.current = null;
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
  const sectionClassName =
    presentation === "ledger"
      ? "border-t border-ledger-line pt-4"
      : panelClassName;
  const listClassName =
    presentation === "ledger"
      ? "mt-4 overflow-visible rounded-lg border border-ledger-line bg-ledger-panel shadow-soft"
      : "mt-4 overflow-visible rounded-md border border-ledger-line";

  return (
    <section className={sectionClassName}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-ledger-ink">{title}</h2>
          <p className="mt-1 text-sm text-ledger-muted">
            {description}
          </p>
        </div>
        {!hideRefreshAction || state === "error" ? (
          <Button
            disabled={isLoading}
            onClick={() => void loadTransactions()}
            type="button"
            variant="outline"
          >
            {isLoading ? "Đang tải" : isRefreshing ? "Làm mới" : "Thử lại"}
          </Button>
        ) : null}
      </div>

      <div className={listClassName}>
        {isLoading ? <LoadingState /> : null}
        {state === "error" ? <ErrorState /> : null}
        {state === "loaded" && transactions.length === 0 ? (
          <EmptyState
            hasFilters={hasActiveFilters(filters)}
            onClearFilters={onClearFilters}
          />
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
                      : (selectedTransaction, returnFocus) => {
                          setDeleteNotice(null);
                          setDeleteError(null);
                          returnFocusAfterDeleteRef.current = returnFocus;
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
              returnFocusAfterDeleteRef.current?.();
              returnFocusAfterDeleteRef.current = null;
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
    <div className="grid gap-3 bg-ledger-panel p-4">
      <p className="text-sm font-medium text-ledger-ink">
        Đang tải giao dịch gần đây...
      </p>
      <div className="h-3 w-3/4 rounded bg-ledger-line" />
      <div className="h-3 w-1/2 rounded bg-ledger-line" />
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <div className="grid min-h-48 place-items-center bg-ledger-panel p-6 text-center">
      <div className="max-w-sm">
      <div
        aria-hidden="true"
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ledger-accent-soft text-ledger-accent"
      >
        <span className="text-xl">≡</span>
      </div>
      <p className="text-base font-semibold text-ledger-ink">
        {hasFilters ? "Không có giao dịch phù hợp" : "Chưa có giao dịch"}
      </p>
      <p className="mt-1 text-sm text-ledger-muted">
        {hasFilters
          ? "Thử đổi tháng, danh mục, loại giao dịch hoặc từ khóa tìm kiếm."
          : "Bạn có thể thêm giao dịch bằng Trợ lý."}
      </p>
      {hasFilters && onClearFilters ? (
        <Button
          className="mt-4"
          onClick={onClearFilters}
          type="button"
          variant="outline"
        >
          Xóa bộ lọc
        </Button>
      ) : (
        <Link
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-ledger-line bg-ledger-panel px-4 text-sm font-semibold text-ledger-ink transition-colors hover:border-ledger-accent hover:text-ledger-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-focus"
          href="/assistant"
        >
          Mở Trợ lý
        </Link>
      )}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="bg-ledger-panel p-4">
      <p className="text-sm font-medium text-ledger-danger">
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

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.code === DOMException.ABORT_ERR)
  );
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
