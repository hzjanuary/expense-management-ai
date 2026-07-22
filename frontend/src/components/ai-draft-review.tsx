import type { AiTransactionDraft } from "@/lib/ai";
import { formatCategoryLabel } from "@/lib/categories";
import { formatVnd } from "@/lib/money";
import { Button } from "@/components/ui";

type AiDraftReviewProps = {
  confidence?: string;
  draft: AiTransactionDraft;
  isCancelling?: boolean;
  isConfirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AiDraftReview({
  draft,
  isCancelling = false,
  isConfirming,
  onCancel,
  onConfirm,
}: AiDraftReviewProps) {
  return (
    <div className="rounded-lg border border-ledger-line bg-white p-3 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ledger-muted">
            Bản nháp giao dịch
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-ledger-accent sm:mt-2 sm:text-4xl">
            <span className="sr-only">
              {draft.type === "expense" ? "Khoản chi" : "Khoản thu"}
            </span>
            {formatVnd(draft.amount_minor)}
          </p>
          <p className="mt-1 text-lg font-semibold leading-6 text-ledger-ink sm:mt-2">
            {draft.description}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 sm:px-3">
          Chưa được lưu
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ledger-line pt-3 text-xs sm:mt-4 sm:grid-cols-3 sm:gap-3 sm:pt-4 sm:text-sm">
        <DraftField label="Loại" value={draft.type === "expense" ? "Chi" : "Thu"} />
        <DraftField label="Danh mục" value={formatCategory(draft.category_slug)} />
        <DraftField
          label="Thời điểm"
          value={
            draft.occurred_at
              ? formatDate(draft.occurred_at)
              : "Dùng thời điểm xác nhận"
          }
        />
      </dl>

      <p className="mt-3 text-xs leading-5 text-ledger-muted sm:text-sm">
        Chưa ghi vào sổ cho đến khi bạn xác nhận.
      </p>

      <div className="mt-3 flex items-center gap-2 sm:mt-5">
        <Button
          className="flex-1 sm:flex-none"
          disabled={isConfirming || isCancelling}
          onClick={onConfirm}
          type="button"
          variant="primary"
        >
          {isConfirming ? "Đang xác nhận" : "Xác nhận"}
        </Button>
        <Button
          className="shrink-0"
          disabled={isConfirming || isCancelling}
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          {isCancelling ? "Đang hủy" : "Hủy"}
        </Button>
      </div>
    </div>
  );
}

type DraftFieldProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

function DraftField({ label, value, valueClassName }: DraftFieldProps) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.68rem] font-medium uppercase leading-4 text-ledger-muted sm:text-xs">
        {label}
      </dt>
      <dd className={`mt-1 truncate font-semibold ${valueClassName ?? "text-ledger-ink"}`}>
        {value}
      </dd>
    </div>
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
  return formatCategoryLabel(value);
}
