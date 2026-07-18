"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DashboardApiError,
  fetchDashboardSummary,
  type DashboardSummaryResponse,
} from "@/lib/dashboard";
import { formatVnd } from "@/lib/money";

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
        className="rounded-lg border border-rose-200 bg-rose-50 p-5 shadow-soft"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rose-800">
              Chưa tải được tổng quan
            </h2>
            <p className="mt-1 text-sm text-rose-700">
              {error ?? "Không tải được số liệu tổng quan."}
            </p>
          </div>
          <button
            className="h-10 rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-400"
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

  const items = [
    {
      label: "Số dư hiện tại",
      value: formatVnd(summary.total_balance_minor),
      note: `Số dư đang lưu. Tiền tệ: ${summary.currency}.`,
      tone: "text-ledger-ink",
    },
    {
      label: "Thu trong tháng",
      value: formatVnd(summary.monthly_income_minor),
      note: `Khoản thu trong ${month}.`,
      tone: "text-emerald-700",
    },
    {
      label: "Chi trong tháng",
      value: formatVnd(summary.monthly_expense_minor),
      note: `Khoản chi trong ${month}.`,
      tone: "text-rose-700",
    },
    {
      label: "Danh mục có chi",
      value: String(summary.category_breakdown.length),
      note: "Số danh mục có giao dịch trong tháng.",
      tone: "text-ledger-ink",
    },
  ];

  return (
    <section aria-live="polite" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft"
          key={item.label}
        >
          <p className="text-sm font-medium text-ledger-muted">{item.label}</p>
          <p className={`mt-3 text-2xl font-semibold tracking-normal ${item.tone}`}>
            {item.value}
          </p>
          <p className="mt-3 text-xs leading-5 text-ledger-muted">{item.note}</p>
        </article>
      ))}
    </section>
  );
}

function SummaryLoading({ month }: { month: string }) {
  return (
    <section
      aria-live="polite"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      role="status"
    >
      {[1, 2, 3, 4].map((item) => (
        <article
          className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft"
          key={item}
        >
          <p className="text-sm font-medium text-ledger-muted">
            Đang tải số liệu {month}...
          </p>
          <div className="mt-4 h-8 w-28 rounded bg-ledger-line" />
          <div className="mt-4 h-3 w-36 rounded bg-ledger-line" />
        </article>
      ))}
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
