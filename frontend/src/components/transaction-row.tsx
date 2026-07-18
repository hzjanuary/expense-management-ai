import { formatVnd } from "@/lib/money";
import { Button } from "@/components/ui";
import type { TransactionListItem } from "@/lib/transactions";

type TransactionRowProps = {
  onDeleteRequested?: (transaction: TransactionListItem) => void;
  transaction: TransactionListItem;
};

export function TransactionRow({
  onDeleteRequested,
  transaction,
}: TransactionRowProps) {
  const isExpense = transaction.type === "expense";
  const amountPrefix = isExpense ? "-" : "+";
  const amountTone = isExpense ? "text-rose-700" : "text-ledger-accent";
  const badgeTone = isExpense
    ? "bg-rose-50 text-rose-700"
    : "bg-emerald-50 text-emerald-700";

  return (
    <li className="grid gap-3 bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ledger-ink">
            {transaction.description}
          </p>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${badgeTone}`}>
            {transaction.type === "expense" ? "Chi" : "Thu"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ledger-muted">
          <span>{formatCategory(transaction.category_slug)}</span>
          <span>{formatDate(transaction.occurred_at)}</span>
          <span>Nguồn: {transaction.source === "ai_chat" ? "Trợ lý AI" : "Thủ công"}</span>
          {transaction.merchant ? <span>{transaction.merchant}</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <p className={`text-right text-base font-semibold ${amountTone}`}>
          {amountPrefix}
          {formatVnd(transaction.amount_minor)}
        </p>
        {onDeleteRequested ? (
          <Button
            aria-label={`Xóa giao dịch ${transaction.description}`}
            onClick={() => onDeleteRequested(transaction)}
            size="small"
            type="button"
            variant="danger"
          >
            Xóa
          </Button>
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

function formatCategory(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
