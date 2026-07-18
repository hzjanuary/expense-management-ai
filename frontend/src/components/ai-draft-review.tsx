import type { AiTransactionDraft } from "@/lib/ai";
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
            Review AI Draft
          </p>
          <p className="mt-1 text-xs text-ledger-muted">
            Confirming sends this stored draft to the backend confirmation flow.
          </p>
        </div>
        <span className="w-fit rounded-md bg-ledger-wash px-2 py-1 text-xs font-semibold text-ledger-muted">
          confidence: {confidence}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DraftField label="Type" value={draft.type} />
        <DraftField
          label="Amount"
          value={`${amountPrefix}${formatVnd(draft.amount_minor)} ${draft.currency}`}
          valueClassName={amountTone}
        />
        <DraftField label="Category" value={formatCategory(draft.category_slug)} />
        <DraftField label="Source" value={draft.source} />
        <DraftField label="Description" value={draft.description} />
        <DraftField
          label="Occurred"
          value={
            draft.occurred_at
              ? formatDate(draft.occurred_at)
              : "Uses confirmation time"
          }
        />
      </dl>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          disabled={isConfirming}
          onClick={onConfirm}
          type="button"
        >
          {isConfirming ? "Confirming" : "Confirm"}
        </Button>
        <Button
          disabled={isConfirming}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancel
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
    return "Unknown date";
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
