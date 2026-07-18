import type {
  AiInsightDateRange,
  AiQueryBudgetRemainingResponse,
  AiQuerySpendingBreakdownResponse,
  AiQuerySpendingResponse,
} from "@/lib/ai";
import { formatCategoryLabel } from "@/lib/categories";
import { formatVnd } from "@/lib/money";

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
    return (
      <InsightCard
        isStale={props.isStale}
        title="Spending Insight"
        subtitle="Database-grounded category spending"
      >
        <SpendingQueryResult result={props.result} />
      </InsightCard>
    );
  }

  if (props.type === "budget_remaining") {
    return (
      <InsightCard
        isStale={props.isStale}
        title="Budget Insight"
        subtitle="Database-grounded budget remaining"
      >
        <BudgetRemainingResult result={props.result} />
      </InsightCard>
    );
  }

  return (
    <InsightCard
      isStale={props.isStale}
      title="Top Spending Insight"
      subtitle="Database-grounded spending breakdown"
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
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <InsightField
          label="Category"
          value={formatOptionalCategory(result.category_slug)}
        />
        <InsightField label="Period" value={formatDateRange(result.date_range)} />
        <InsightField
          label="Amount"
          value={
            result.amount_minor === null
              ? "Needs clarification"
              : formatVnd(result.amount_minor)
          }
        />
        <InsightField
          label="Transactions"
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
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No budget configured for {formatOptionalCategory(result.category_slug)}.
        </p>
      ) : null}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <InsightField
          label="Category"
          value={formatOptionalCategory(result.category_slug)}
        />
        <InsightField label="Period" value={formatDateRange(result.date_range)} />
        <InsightField
          label="Budget"
          value={
            result.budget_minor === null
              ? "No configured budget"
              : formatVnd(result.budget_minor)
          }
        />
        <InsightField
          label="Spent"
          value={
            result.spent_minor === null
              ? "Needs clarification"
              : formatVnd(result.spent_minor)
          }
        />
        <InsightField
          label="Remaining"
          value={
            result.remaining_minor === null
              ? "No configured budget"
              : formatVnd(result.remaining_minor)
          }
        />
        <InsightField
          label="Status"
          value={
            result.is_over_budget === null
              ? "No budget configured"
              : result.is_over_budget
                ? "Over budget"
                : "Within budget"
          }
        />
        <InsightField
          label="Transactions"
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
        <p className="rounded-md border border-ledger-line bg-ledger-wash px-3 py-2 text-sm text-ledger-muted">
          No expenses found for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <InsightAnswer answer={result.answer} />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <InsightField label="Period" value={formatDateRange(result.date_range)} />
        <InsightField
          label="Total expense"
          value={
            result.total_expense_minor === null
              ? "Needs clarification"
              : formatVnd(result.total_expense_minor)
          }
        />
        <InsightField
          label="Transactions"
          value={String(result.transaction_count)}
        />
        <InsightField
          label="Top category"
          value={
            result.top_category
              ? `${formatCategoryLabel(
                  result.top_category.category_slug,
                )}: ${formatVnd(result.top_category.amount_minor)}`
              : "No top category"
          }
        />
      </dl>
      <table className="w-full border-separate border-spacing-y-2 text-left text-sm">
        <caption className="sr-only">Spending breakdown by category</caption>
        <thead className="text-xs uppercase text-ledger-muted">
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Amount</th>
            <th scope="col">Count</th>
            <th scope="col">Share</th>
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
                {entry.percentage.toFixed(2)}%
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
    <article className="rounded-md border border-ledger-line bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ledger-ink">{title}</h3>
          <p className="mt-1 text-xs text-ledger-muted">{subtitle}</p>
        </div>
        {isStale ? (
          <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
            Financial data changed. Run again to refresh.
          </span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function InsightAnswer({ answer }: { answer: string | null }) {
  return answer ? (
    <p className="rounded-md border border-ledger-line bg-ledger-wash px-3 py-2 text-sm text-ledger-ink">
      {answer}
    </p>
  ) : null;
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
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-semibold">
        {clarification?.message ?? "This insight needs clarification."}
      </p>
      {clarification && clarification.fields.length > 0 ? (
        <p className="mt-1 text-xs">Missing fields: {clarification.fields.join(", ")}</p>
      ) : null}
    </div>
  );
}

function formatOptionalCategory(categorySlug: string | null): string {
  return categorySlug === null
    ? "Needs clarification"
    : formatCategoryLabel(categorySlug);
}

function formatDateRange(dateRange: AiInsightDateRange | null): string {
  if (dateRange === null) {
    return "Needs clarification";
  }

  return `${formatDate(dateRange.start)} to ${formatDate(dateRange.end)} (${dateRange.label})`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(date);
}
import type { ReactNode } from "react";
