import type { AiTransactionDraft } from "@/lib/ai";
import { formatCategoryLabel } from "@/lib/categories";
import { formatVnd } from "@/lib/money";
import { Button } from "@/components/ui";

type AiDraftReviewProps = {
  confidence: string;
  draft: AiTransactionDraft;
  isConfirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AiDraftReview({
  confidence,
  draft,
  isConfirming,
  onCancel,
  onConfirm,
}: AiDraftReviewProps) {
  const amountPrefix = draft.type === "expense" ? "-" : "+";
  const amountTone =
    draft.type === "expense" ? "text-rose-700" : "text-ledger-accent";

  return (
    <div className="rounded-md border border-ledger-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ledger-ink">
            Kiểm tra bản nháp
          </p>
          <p className="mt-1 text-xs text-ledger-muted">
            Chỉ khi bạn xác nhận, giao dịch này mới được ghi vào sổ.
          </p>
        </div>
        <span className="w-fit rounded-md bg-ledger-wash px-2 py-1 text-xs font-semibold text-ledger-muted">
          độ tin cậy: {confidence}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DraftField label="Loại" value={draft.type === "expense" ? "Chi" : "Thu"} />
        <DraftField
          label="Số tiền"
          value={`${amountPrefix}${formatVnd(draft.amount_minor)} ${draft.currency}`}
          valueClassName={amountTone}
        />
        <DraftField label="Danh mục" value={formatCategory(draft.category_slug)} />
        <DraftField
          label="Nguồn"
          value={draft.source === "ai_chat" ? "Trợ lý AI" : "Thủ công"}
        />
        <DraftField label="Ghi chú" value={draft.description} />
        <DraftField
          label="Thời điểm"
          value={
            draft.occurred_at
              ? formatDate(draft.occurred_at)
              : "Dùng thời điểm xác nhận"
          }
        />
      </dl>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          disabled={isConfirming}
          onClick={onConfirm}
          type="button"
        >
          {isConfirming ? "Đang xác nhận" : "Xác nhận"}
        </Button>
        <Button
          disabled={isConfirming}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Hủy
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
    <div>
      <dt className="text-xs font-medium uppercase text-ledger-muted">
        {label}
      </dt>
      <dd className={`mt-1 font-semibold ${valueClassName ?? "text-ledger-ink"}`}>
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
