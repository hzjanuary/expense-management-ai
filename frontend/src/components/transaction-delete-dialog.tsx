"use client";

import { useEffect, useRef } from "react";

import { formatCategoryLabel } from "@/lib/categories";
import { formatVnd } from "@/lib/money";
import { Button } from "@/components/ui";
import type { TransactionListItem } from "@/lib/transactions";

type TransactionDeleteDialogProps = {
  error: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  transaction: TransactionListItem;
};

export function TransactionDeleteDialog({
  error,
  isDeleting,
  onCancel,
  onConfirm,
  transaction,
}: TransactionDeleteDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        onCancel();
      }
      if (event.key === "Tab") {
        trapFocus(event, dialogRef.current);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onCancel]);

  const amountPrefix = transaction.type === "expense" ? "−" : "+";

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-ledger-overlay/50 p-0 sm:place-items-center sm:p-4">
      <div
        aria-describedby="delete-transaction-description"
        aria-labelledby="delete-transaction-title"
        aria-modal="true"
        className="max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-t-xl border border-ledger-line bg-ledger-panel p-5 shadow-dialog sm:max-w-md sm:rounded-lg"
        ref={dialogRef}
        role="dialog"
      >
        <h3
          className="text-base font-semibold text-ledger-ink"
          id="delete-transaction-title"
        >
          Xóa giao dịch?
        </h3>
        <p
          className="mt-2 text-sm text-ledger-muted"
          id="delete-transaction-description"
        >
          Giao dịch sẽ biến mất khỏi các màn hình đang dùng và số dư sẽ được
          hoàn lại đúng theo loại giao dịch. Bản ghi vẫn được giữ trong máy,
          không bị xóa vĩnh viễn.
        </p>

        <dl className="mt-4 grid gap-2 rounded-md border border-ledger-line bg-ledger-wash p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ledger-muted">Số tiền</dt>
            <dd className="font-semibold text-ledger-ink">
              {amountPrefix}
              {formatVnd(transaction.amount_minor)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ledger-muted">Danh mục</dt>
            <dd className="font-semibold text-ledger-ink">
              {formatCategoryLabel(transaction.category_slug)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ledger-muted">Ngày</dt>
            <dd className="font-semibold text-ledger-ink">
              {formatDeleteDate(transaction.occurred_at)}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-ledger-muted">Ghi chú</dt>
            <dd className="font-semibold text-ledger-ink">
              {transaction.description}
            </dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-3 text-sm font-medium text-ledger-danger" role="alert">
            {error}
          </p>
        ) : null}
        {isDeleting ? (
          <p className="mt-3 text-sm text-ledger-muted" role="status">
            Đang xóa giao dịch...
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-end sm:pb-0">
          <Button
            disabled={isDeleting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
            variant="danger"
          >
            {isDeleting ? "Đang xóa" : "Xóa giao dịch"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) {
    return;
  }
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (focusable.length === 0) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function formatDeleteDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không rõ ngày";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
