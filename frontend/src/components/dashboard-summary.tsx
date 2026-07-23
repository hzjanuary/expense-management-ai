"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DashboardApiError,
  fetchDashboardSummary,
  type DashboardSummaryResponse,
} from "@/lib/dashboard";
import { formatCategoryLabel } from "@/lib/categories";
import { formatMonthDisplayLabel, formatVnd } from "@/lib/money";

type LoadState = "idle" | "loading" | "loaded" | "error";

type DashboardSummaryProps = {
  month: string;
  refreshSignal: number;
};

export function DashboardSummary({
  month,
  refreshSignal,
}: DashboardSummaryProps) {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadSummary = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;
      setState("loading");
      setError(null);

      try {
        const result = await fetchDashboardSummary(month, signal);
        if (requestSequence.current !== requestId || signal?.aborted) {
          return;
        }
        setSummary(result);
        setState("loaded");
      } catch (caughtError) {
        if (isAbortError(caughtError)) {
          return;
        }
        if (requestSequence.current !== requestId) {
          return;
        }
        setError(getSummaryErrorMessage(caughtError));
        setState("error");
      }
    },
    [month],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadSummary(controller.signal);
    return () => controller.abort();
  }, [loadSummary, refreshSignal]);

  if (state === "loading" || state === "idle") {
    return <SummaryLoading month={month} />;
  }

  if (state === "error") {
    return (
      <section
        aria-live="polite"
        className="rounded-lg border border-ledger-danger bg-ledger-danger-soft p-5 shadow-soft"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ledger-danger">
              Chưa tải được tổng quan
            </h2>
            <p className="mt-1 text-sm text-ledger-danger">
              {error ?? "Không tải được số liệu tổng quan."}
            </p>
          </div>
          <button
            className="h-10 rounded-md border border-ledger-danger bg-ledger-panel px-4 text-sm font-semibold text-ledger-danger transition hover:border-ledger-danger"
            onClick={() => void loadSummary()}
            type="button"
          >
            Thử lại
          </button>
        </div>
      </section>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <section aria-live="polite">
      <article className="rounded-lg border border-ledger-line bg-ledger-panel p-6 shadow-soft">
        <p className="text-sm font-semibold text-ledger-muted">
          Số dư hiện tại
        </p>
        <p className="mt-3 break-words text-4xl font-semibold tracking-normal text-ledger-ink sm:text-5xl">
          {formatVnd(summary.total_balance_minor)}
        </p>
        <div className="mt-6 grid gap-4 border-t border-ledger-line pt-5 sm:grid-cols-2">
          <SummarySubValue
            label="Thu tháng này"
            tone="income"
            value={formatVnd(summary.monthly_income_minor, { sign: "positive" })}
          />
          <SummarySubValue
            label="Chi tháng này"
            tone="expense"
            value={formatVnd(summary.monthly_expense_minor, { sign: "negative" })}
          />
        </div>
      </article>
    </section>
  );
}

export function DashboardCategoryBreakdown({
  month,
  refreshSignal,
}: DashboardSummaryProps) {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const requestSequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setState("loading");

    fetchDashboardSummary(month, controller.signal)
      .then((result) => {
        if (requestSequence.current !== requestId || controller.signal.aborted) {
          return;
        }
        setSummary(result);
        setState("loaded");
      })
      .catch((caughtError) => {
        if (isAbortError(caughtError) || requestSequence.current !== requestId) {
          return;
        }
        setState("error");
      });

    return () => controller.abort();
  }, [month, refreshSignal]);

  const expenseBreakdown = (summary?.category_breakdown ?? []).filter(
    (category) => category.type === "expense",
  );

  return (
    <section aria-live="polite" className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ledger-ink">
            Chi tiêu theo danh mục
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Các khoản chi trong {formatMonthDisplayLabel(month)}.
          </p>
        </div>
        {state === "loaded" ? (
          <span className="text-sm font-semibold text-ledger-muted">
            {expenseBreakdown.length}
          </span>
        ) : null}
      </div>
      {state === "loading" || state === "idle" ? (
        <div className="mt-4 grid gap-3" role="status">
          <div className="h-4 rounded bg-ledger-line" />
          <div className="h-4 w-10/12 rounded bg-ledger-line" />
          <div className="h-4 w-8/12 rounded bg-ledger-line" />
        </div>
      ) : null}
      {state === "error" ? (
        <p className="mt-4 text-sm text-ledger-danger">
          Chưa tải được chi tiêu theo danh mục.
        </p>
      ) : null}
      {state === "loaded" && expenseBreakdown.length === 0 ? (
        <p className="mt-4 border-t border-ledger-line pt-4 text-sm text-ledger-muted">
          Chưa có khoản chi nào trong tháng này.
        </p>
      ) : null}
      {state === "loaded" && expenseBreakdown.length > 0 ? (
        <ul className="mt-4 divide-y divide-ledger-line">
          {expenseBreakdown.slice(0, 5).map((category) => (
            <li
              className="flex items-center justify-between gap-4 py-3"
              key={category.category_slug}
            >
              <span className="text-sm font-medium text-ledger-ink">
                {formatCategoryLabel(category.category_slug)}
              </span>
              <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-ledger-ink">
                {formatVnd(category.amount_minor)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SummarySubValue({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "expense" | "income";
  value: string;
}) {
  const toneClass = tone === "income" ? "text-ledger-accent" : "text-ledger-danger";

  return (
    <div>
      <p className="text-sm font-medium text-ledger-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        <span className="sr-only">{tone === "income" ? "Khoản thu" : "Khoản chi"}</span>
        {value}
      </p>
    </div>
  );
}

function SummaryLoading({ month }: { month: string }) {
  return (
    <section
      aria-live="polite"
      role="status"
    >
      <article className="rounded-lg border border-ledger-line bg-ledger-panel p-6 shadow-soft">
        <p className="text-sm font-medium text-ledger-muted">
          Đang tải số liệu {formatMonthDisplayLabel(month)}...
        </p>
        <div className="mt-4 h-12 w-64 max-w-full rounded bg-ledger-line" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="h-16 rounded bg-ledger-line" />
          <div className="h-16 rounded bg-ledger-line" />
        </div>
      </article>
    </section>
  );
}

function getSummaryErrorMessage(error: unknown): string {
  if (error instanceof DashboardApiError) {
    return error.message;
  }
  return "Không tải được số liệu tổng quan.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
