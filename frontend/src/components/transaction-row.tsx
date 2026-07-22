"use client";

import { useEffect, useRef, useState } from "react";

import { formatCategoryLabel } from "@/lib/categories";
import { Button } from "@/components/ui";
import { formatVnd } from "@/lib/money";
import type { TransactionListItem } from "@/lib/transactions";

type TransactionRowProps = {
  onDeleteRequested?: (transaction: TransactionListItem) => void;
  transaction: TransactionListItem;
};

export function TransactionRow({
  onDeleteRequested,
  transaction,
}: TransactionRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isExpense = transaction.type === "expense";
  const amountPrefix = isExpense ? "−" : "+";
  const amountTone = isExpense ? "text-rose-700" : "text-ledger-accent";

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <li className="grid gap-3 bg-white px-4 py-4 transition hover:bg-ledger-wash/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3 sm:block">
          <p className="min-w-0 text-sm font-semibold leading-5 text-ledger-ink">
            {transaction.description}
          </p>
          <p
            className={`shrink-0 text-right text-sm font-semibold tabular-nums sm:hidden ${amountTone}`}
          >
            <span className="sr-only">
              {isExpense ? "Khoản chi" : "Khoản thu"}
            </span>
            {amountPrefix}
            {formatVnd(transaction.amount_minor)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ledger-muted">
          <span>{formatDate(transaction.occurred_at)}</span>
          <span>{formatCategoryLabel(transaction.category_slug)}</span>
          <span>{transaction.type === "expense" ? "Khoản chi" : "Khoản thu"}</span>
          <span>
            {transaction.source === "ai_chat" ? "Từ trợ lý" : "Nhập tay"}
          </span>
          {transaction.merchant ? <span>{transaction.merchant}</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <p
          className={`hidden min-w-32 text-right text-base font-semibold tabular-nums sm:block ${amountTone}`}
        >
          <span className="sr-only">
            {isExpense ? "Khoản chi" : "Khoản thu"}
          </span>
          {amountPrefix}
          {formatVnd(transaction.amount_minor)}
        </p>
        {onDeleteRequested ? (
          <div className="relative" ref={menuRef}>
            <Button
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              aria-label={`Mở menu giao dịch ${transaction.description}`}
              onClick={() => setIsMenuOpen((current) => !current)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ...
              </span>
            </Button>
            {isMenuOpen ? (
              <div
                className="absolute right-0 top-11 z-20 w-44 rounded-md border border-ledger-line bg-white p-1 shadow-dialog"
                role="menu"
              >
                <button
                  className="flex min-h-10 w-full items-center rounded px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ledger-accent"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDeleteRequested(transaction);
                  }}
                  role="menuitem"
                  type="button"
                >
                  Xóa giao dịch
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không rõ ngày";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
