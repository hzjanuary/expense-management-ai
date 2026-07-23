import type {
  AiInsightDateRange,
  AiQueryBudgetRemainingResponse,
  AiQuerySpendingBreakdownResponse,
  AiQuerySpendingResponse,
} from "@/lib/ai";
import { formatCategoryLabel } from "@/lib/categories";
import { formatMonthDisplayLabel, formatPercent, formatVnd } from "@/lib/money";

type InsightResultProps =
  | {
      isStale: boolean;
      result: AiQuerySpendingResponse;
      type: "query_spending";
    }
  | {
      isStale: boolean;
      result: AiQueryBudgetRemainingResponse;
      type: "budget_remaining";
    }
  | {
      isStale: boolean;
      result: AiQuerySpendingBreakdownResponse;
      type: "spending_breakdown";
    };

export function InsightResult(props: InsightResultProps) {
  if (props.type === "query_spending") {
    const isTotal = props.result.spending_scope === "total";
    return (
      <InsightCard
        isStale={props.isStale}
        title={isTotal ? "Tổng chi tiêu" : "Chi tiêu theo danh mục"}
        subtitle="Số liệu lấy từ giao dịch đang lưu"
      >
        <SpendingQueryResult result={props.result} />
      </InsightCard>
    );
  }

  if (props.type === "budget_remaining") {
    return (
      <InsightCard
        isStale={props.isStale}
        title="Ngân sách còn lại"
        subtitle="Số đã chi và còn lại theo ngân sách"
      >
        <BudgetRemainingResult result={props.result} />
      </InsightCard>
    );
  }

  return (
    <InsightCard
      isStale={props.isStale}
      title="Chi nhiều nhất"
      subtitle="Tổng hợp chi tiêu theo danh mục"
    >
      <SpendingBreakdownResult result={props.result} />
    </InsightCard>
  );
}

function SpendingQueryResult({
  result,
}: {
  result: AiQuerySpendingResponse;
}) {
  if (result.needs_clarification) {
    return <InsightClarification clarification={result.clarification} />;
  }

  return (
    <div className="grid gap-3">
      <InsightAnswer answer={result.answer} />
      <p className="text-3xl font-semibold tabular-nums text-ledger-ink">
        {result.amount_minor === null
          ? "Cần làm rõ"
          : formatVnd(result.amount_minor)}
      </p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {result.spending_scope !== "total" ? (
          <InsightField
            label="Danh mục"
            value={formatOptionalCategory(result.category_slug)}
          />
        ) : null}
        <InsightField label="Thời gian" value={formatDateRange(result.date_range)} />
        <InsightField
          label="Số giao dịch"
          value={String(result.transaction_count)}
        />
      </dl>
    </div>
  );
}

function BudgetRemainingResult({
  result,
}: {
  result: AiQueryBudgetRemainingResponse;
}) {
  if (result.needs_clarification) {
    return <InsightClarification clarification={result.clarification} />;
  }

  const hasBudget =
    result.budget_minor !== null && result.remaining_minor !== null;

  return (
    <div className="grid gap-3">
      <InsightAnswer answer={result.answer} />
      {!hasBudget ? (
        <p className="rounded-md border border-ledger-warning bg-ledger-warning-soft px-3 py-2 text-sm text-ledger-warning">
          Chưa thiết lập ngân sách cho {formatOptionalCategory(result.category_slug)}.
        </p>
      ) : null}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <InsightField
          label="Danh mục"
          value={formatOptionalCategory(result.category_slug)}
        />
        <InsightField label="Thời gian" value={formatDateRange(result.date_range)} />
        <InsightField
          label="Ngân sách"
          value={
            result.budget_minor === null
              ? "Chưa thiết lập ngân sách"
              : formatVnd(result.budget_minor)
          }
        />
        <InsightField
          label="Đã chi"
          value={
            result.spent_minor === null
              ? "Cần làm rõ"
              : formatVnd(result.spent_minor)
          }
        />
        <InsightField
          label="Còn lại"
          value={
            result.remaining_minor === null
              ? "Chưa thiết lập ngân sách"
              : formatVnd(result.remaining_minor)
          }
        />
        <InsightField
          label="Tình trạng"
          value={
            result.is_over_budget === null
              ? "Chưa thiết lập ngân sách"
              : result.is_over_budget
                ? "Đã vượt ngân sách"
                : "Còn trong ngân sách"
          }
        />
        <InsightField
          label="Số giao dịch"
          value={String(result.transaction_count)}
        />
      </dl>
    </div>
  );
}

function SpendingBreakdownResult({
  result,
}: {
  result: AiQuerySpendingBreakdownResponse;
}) {
  if (result.needs_clarification) {
    return <InsightClarification clarification={result.clarification} />;
  }

  if (result.total_expense_minor === 0 || result.breakdown.length === 0) {
    return (
      <div className="grid gap-3">
        <InsightAnswer answer={result.answer} />
        <InsightField label="Thời gian" value={formatDateRange(result.date_range)} />
        <p className="rounded-md border border-ledger-line bg-ledger-wash px-3 py-2 text-sm text-ledger-muted">
          Chưa có khoản chi trong khoảng thời gian này.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <InsightAnswer answer={result.answer} />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <InsightField label="Thời gian" value={formatDateRange(result.date_range)} />
        <InsightField
          label="Tổng chi"
          value={
            result.total_expense_minor === null
              ? "Cần làm rõ"
              : formatVnd(result.total_expense_minor)
          }
        />
        <InsightField
          label="Số giao dịch"
          value={String(result.transaction_count)}
        />
        <InsightField
          label="Chi nhiều nhất"
          value={
            result.top_category
              ? `${formatCategoryLabel(
                  result.top_category.category_slug,
                )}: ${formatVnd(result.top_category.amount_minor)}`
            : "Chưa có danh mục nổi bật"
          }
        />
      </dl>
      <table className="w-full border-separate border-spacing-y-2 text-left text-sm">
        <caption className="sr-only">Chi tiêu theo từng danh mục</caption>
        <thead className="text-xs uppercase text-ledger-muted">
          <tr>
            <th scope="col">Danh mục</th>
            <th scope="col">Số tiền</th>
            <th scope="col">Số lần</th>
            <th scope="col">Tỷ lệ</th>
          </tr>
        </thead>
        <tbody>
          {result.breakdown.map((entry) => (
            <tr key={entry.category_slug} className="bg-ledger-wash">
              <td className="rounded-l-md px-3 py-2 font-semibold text-ledger-ink">
                {formatCategoryLabel(entry.category_slug)}
              </td>
              <td className="px-3 py-2 text-ledger-ink">
                {formatVnd(entry.amount_minor)}
              </td>
              <td className="px-3 py-2 text-ledger-muted">
                {entry.transaction_count}
              </td>
              <td className="rounded-r-md px-3 py-2 text-ledger-muted">
                {formatPercent(entry.percentage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightCard({
  children,
  isStale,
  subtitle,
  title,
}: {
  children: ReactNode;
  isStale: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ledger-ink">{title}</h3>
          <p className="mt-1 text-xs text-ledger-muted">{subtitle}</p>
        </div>
        {isStale ? (
          <span className="w-fit rounded-md border border-ledger-warning bg-ledger-warning-soft px-2 py-1 text-xs font-semibold text-ledger-warning">
            Số liệu đã thay đổi. Hỏi lại để cập nhật.
          </span>
        ) : null}
      </div>
      <div className="mt-4 border-t border-ledger-line pt-4">{children}</div>
    </article>
  );
}

function InsightAnswer({ answer }: { answer: string | null }) {
  return answer ? (
    <p className="text-sm leading-6 text-ledger-muted">
      {formatAnswerText(answer)}
    </p>
  ) : null;
}

function formatAnswerText(answer: string): string {
  return answer.replace(/([+−-]?\d[\d.]*)\s*(?:₫|đ|VND)/gi, (match) =>
    match
      .replace(/\s*(?:₫|đ|VND)/i, " ₫")
      .replace(/^-/, "−"),
  );
}

function InsightField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-ledger-muted">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-ledger-ink">{value}</dd>
    </div>
  );
}

function InsightClarification({
  clarification,
}: {
  clarification: { message: string; fields: string[] } | null;
}) {
  return (
    <div className="rounded-lg border border-ledger-warning bg-ledger-warning-soft px-4 py-4 text-sm text-ledger-ink">
      <p className="font-semibold">Cần thêm thông tin</p>
      <p className="mt-2 leading-6">
        {clarification?.message ?? "Bạn có thể nói rõ hơn để trợ lý trả lời chính xác."}
      </p>
    </div>
  );
}

function formatOptionalCategory(categorySlug: string | null): string {
  return categorySlug === null
    ? "Cần làm rõ"
    : formatCategoryLabel(categorySlug);
}

function formatDateRange(dateRange: AiInsightDateRange | null): string {
  if (dateRange === null) {
    return "Cần làm rõ";
  }

  if (dateRange.label === "this_month") {
    return formatMonthDisplayLabel(dateRange.start);
  }
  if (dateRange.label === "this_week") {
    const inclusiveEnd = new Date(dateRange.end);
    inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
    return `${formatDate(dateRange.start)} đến ${formatDate(
      inclusiveEnd.toISOString(),
    )}`;
  }

  return `${formatDate(dateRange.start)} đến ${formatDate(dateRange.end)} (${formatPeriodLabel(dateRange.label)})`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không rõ ngày";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatPeriodLabel(label: string): string {
  if (label === "this_month") {
    return "tháng này";
  }
  if (label === "this_week") {
    return "tuần này";
  }
  return label;
}
import type { ReactNode } from "react";
