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

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onCancel]);

  const amountPrefix = transaction.type === "expense" ? "-" : "+";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div
        aria-describedby="delete-transaction-description"
        aria-labelledby="delete-transaction-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-ledger-line bg-white p-5 shadow-xl"
        role="dialog"
      >
        <h3
          className="text-base font-semibold text-ledger-ink"
          id="delete-transaction-title"
        >
          Delete transaction?
        </h3>
        <p
          className="mt-2 text-sm text-ledger-muted"
          id="delete-transaction-description"
        >
          This removes the transaction from active ledger views and reverses its
          account-balance effect. The stored record is not permanently erased.
        </p>

        <dl className="mt-4 grid gap-2 rounded-md border border-ledger-line bg-ledger-wash p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ledger-muted">Amount</dt>
            <dd className="font-semibold text-ledger-ink">
              {amountPrefix}
              {formatVnd(transaction.amount_minor)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ledger-muted">Category</dt>
            <dd className="font-semibold text-ledger-ink">
              {formatCategoryLabel(transaction.category_slug)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ledger-muted">Date</dt>
            <dd className="font-semibold text-ledger-ink">
              {formatDeleteDate(transaction.occurred_at)}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-ledger-muted">Description</dt>
            <dd className="font-semibold text-ledger-ink">
              {transaction.description}
            </dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-3 text-sm font-medium text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        {isDeleting ? (
          <p className="mt-3 text-sm text-ledger-muted" role="status">
            Deleting transaction...
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            disabled={isDeleting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
            variant="danger"
          >
            {isDeleting ? "Deleting" : "Delete transaction"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDeleteDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
