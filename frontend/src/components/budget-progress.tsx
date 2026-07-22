"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BudgetApiError,
  BudgetNotConfiguredError,
  fetchBudgetRemaining,
  type BudgetRemainingResponse,
} from "@/lib/budgets";
import { Button, panelClassName } from "@/components/ui";
import { formatCategoryLabel } from "@/lib/categories";
import { formatVnd } from "@/lib/money";

type LoadState = "idle" | "loading" | "loaded" | "missing" | "error";

type BudgetProgressProps = {
  compact?: boolean;
  month: string;
  onSetupRequested: () => void;
  refreshSignal: number;
  setupHref?: string;
};

export function BudgetProgress({
  compact = false,
  month,
  onSetupRequested,
  refreshSignal,
  setupHref,
}: BudgetProgressProps) {
  const [budget, setBudget] = useState<BudgetRemainingResponse | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadBudget = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;
      setState("loading");
      setError(null);

      try {
        const result = await fetchBudgetRemaining(month, "VND", signal);
        if (requestSequence.current !== requestId || signal?.aborted) {
          return;
        }
        setBudget(result);
        setState("loaded");
      } catch (caughtError) {
        if (isAbortError(caughtError)) {
          return;
        }
        if (requestSequence.current !== requestId) {
          return;
        }
        if (caughtError instanceof BudgetNotConfiguredError) {
          setBudget(null);
          setState("missing");
          return;
        }
        setError(getBudgetErrorMessage(caughtError));
        setState("error");
      }
    },
    [month],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadBudget(controller.signal);
    return () => controller.abort();
  }, [loadBudget, refreshSignal]);

  return (
    <section aria-live="polite" className={panelClassName}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-ledger-ink">
            Tình trạng ngân sách
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Số đã chi và còn lại trong {month}.
          </p>
        </div>
        {state === "error" ? (
          <Button
            onClick={() => void loadBudget()}
            type="button"
            variant="outline"
          >
            Thử lại
          </Button>
        ) : null}
      </div>

      {state === "loading" || state === "idle" ? <BudgetLoading /> : null}
      {state === "missing" ? (
        <BudgetMissing
          onSetupRequested={onSetupRequested}
          setupHref={setupHref}
        />
      ) : null}
      {state === "error" ? (
        <BudgetError message={error ?? "Unable to load budget status."} />
      ) : null}
      {state === "loaded" && budget ? (
        <BudgetLoaded
          budget={budget}
          compact={compact}
          onSetupRequested={onSetupRequested}
          setupHref={setupHref}
        />
      ) : null}
    </section>
  );
}

function BudgetLoaded({
  budget,
  compact,
  onSetupRequested,
  setupHref,
}: {
  budget: BudgetRemainingResponse;
  compact: boolean;
  onSetupRequested: () => void;
  setupHref?: string;
}) {
  const isTotalOverBudget = budget.total_remaining_minor < 0;
  const progressPercent = getProgressPercent(
    budget.total_expense_minor,
    budget.total_budget_minor,
  );

  if (compact) {
    return (
      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-ledger-muted">
              Ngân sách tháng
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-ledger-ink">
              {formatVnd(budget.total_budget_minor)}
            </p>
            <p className="mt-1 text-sm font-semibold text-ledger-muted">
              Đã dùng {formatProgressPercent(progressPercent)}
            </p>
          </div>
          <BudgetMetric
            label="Đã chi"
            tone="expense"
            value={formatVnd(budget.total_expense_minor)}
          />
          <BudgetMetric
            label="Còn lại"
            note={isTotalOverBudget ? "Đã vượt ngân sách" : "Còn trong ngân sách"}
            tone={isTotalOverBudget ? "expense" : "income"}
            value={formatVnd(budget.total_remaining_minor)}
          />
        </div>
        <div
          aria-label={`Đã dùng ${formatProgressPercent(progressPercent)} ngân sách tháng`}
          className="h-2 overflow-hidden rounded-full bg-ledger-line"
          role="img"
        >
          <div
            className={isTotalOverBudget ? "h-full bg-rose-600" : "h-full bg-ledger-accent"}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-end">
          <BudgetAction href={setupHref} onClick={onSetupRequested} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="rounded-lg border border-ledger-line bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ledger-muted">
              Ngân sách tháng
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-ledger-ink">
              {formatVnd(budget.total_budget_minor)}
            </p>
          </div>
          <p className="text-sm font-semibold text-ledger-muted">
            Đã dùng {formatProgressPercent(progressPercent)}
          </p>
        </div>
        <div
          aria-label={`Đã dùng ${formatProgressPercent(progressPercent)} ngân sách tháng`}
          className="mt-5 h-2 overflow-hidden rounded-full bg-ledger-line"
          role="img"
        >
          <div
            className={isTotalOverBudget ? "h-full bg-rose-600" : "h-full bg-ledger-accent"}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <dl className="mt-5 grid gap-4 border-t border-ledger-line pt-4 sm:grid-cols-2">
          <BudgetMetric
            label="Đã chi"
            tone="expense"
            value={formatVnd(budget.total_expense_minor)}
          />
          <BudgetMetric
            label="Còn lại"
            note={isTotalOverBudget ? "Đã vượt ngân sách" : "Còn trong ngân sách"}
            tone={isTotalOverBudget ? "expense" : "income"}
            value={formatVnd(budget.total_remaining_minor)}
          />
        </dl>
      </div>

      {budget.categories.length === 0 ? (
        <div className="rounded-md border border-ledger-line bg-white p-4">
          <p className="text-sm font-medium text-ledger-ink">
            Chưa có ngân sách danh mục
          </p>
          <p className="mt-1 text-sm text-ledger-muted">
            Thêm ngân sách cho từng nhóm chi tiêu để theo dõi dễ hơn.
          </p>
          <BudgetAction
            className="mt-3"
            href={setupHref}
            onClick={onSetupRequested}
          />
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <BudgetAction href={setupHref} onClick={onSetupRequested} />
          </div>
          <ul className="divide-y divide-ledger-line overflow-hidden rounded-md border border-ledger-line">
            {budget.categories.map((category) => (
              <li
                className="grid gap-3 bg-white px-4 py-4"
                key={category.category_slug}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ledger-ink">
                    {formatCategoryLabel(category.category_slug)}
                  </p>
                  <span
                    className={
                      category.is_over_budget
                        ? "rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                        : "rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                    }
                  >
                    {category.is_over_budget ? "Đã vượt ngân sách" : "Còn trong ngân sách"}
                  </span>
                </div>
                <div
                  aria-label={`Đã dùng ${formatProgressPercent(
                    getProgressPercent(category.spent_minor, category.budget_minor),
                  )} ngân sách ${formatCategoryLabel(category.category_slug)}`}
                  className="h-1.5 overflow-hidden rounded-full bg-ledger-line"
                  role="img"
                >
                  <div
                    className={
                      category.is_over_budget
                        ? "h-full bg-rose-600"
                        : "h-full bg-ledger-accent"
                    }
                    style={{
                      width: `${Math.min(
                        getProgressPercent(category.spent_minor, category.budget_minor),
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <dl className="grid gap-2 text-xs text-ledger-muted sm:grid-cols-3">
                  <CategoryMetric
                    label="Ngân sách"
                    value={formatVnd(category.budget_minor)}
                  />
                  <CategoryMetric
                    label="Đã chi"
                    value={formatVnd(category.spent_minor)}
                  />
                  <CategoryMetric
                    label="Còn lại"
                    value={formatVnd(category.remaining_minor)}
                  />
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function BudgetAction({
  className,
  href,
  onClick,
}: {
  className?: string;
  href?: string;
  onClick: () => void;
}) {
  if (href) {
    return (
      <Link
        className={[
          "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-ledger-line bg-white px-4 text-sm font-medium text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-accent",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        href={href}
      >
        Sửa ngân sách
      </Link>
    );
  }

  return (
    <Button
      className={className}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      Sửa ngân sách
    </Button>
  );
}

function BudgetMetric({
  label,
  note,
  tone = "default",
  value,
}: {
  label: string;
  note?: string;
  tone?: "default" | "expense" | "income";
  value: string;
}) {
  const valueTone =
    tone === "expense"
      ? "text-rose-700"
      : tone === "income"
        ? "text-emerald-700"
        : "text-ledger-ink";

  return (
    <div>
      <dt className="text-xs font-medium uppercase text-ledger-muted">{label}</dt>
      <dd className={`mt-2 text-xl font-semibold tabular-nums ${valueTone}`}>
        {value}
      </dd>
      {note ? <p className="mt-1 text-xs text-ledger-muted">{note}</p> : null}
    </div>
  );
}

function CategoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-ledger-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ledger-ink">{value}</dd>
    </div>
  );
}

function BudgetLoading() {
  return (
    <div className="mt-5 grid gap-3" role="status">
      <p className="text-sm font-medium text-ledger-ink">
        Đang tải ngân sách...
      </p>
      <div className="h-20 rounded-md bg-ledger-line" />
      <div className="h-16 rounded-md bg-ledger-line" />
    </div>
  );
}

function BudgetMissing({
  onSetupRequested,
  setupHref,
}: {
  onSetupRequested: () => void;
  setupHref?: string;
}) {
  return (
    <div className="mt-5 rounded-md border border-ledger-line bg-white p-4">
      <p className="text-sm font-medium text-ledger-ink">
        Chưa thiết lập ngân sách
      </p>
      <p className="mt-1 text-sm text-ledger-muted">
        Hãy thiết lập ngân sách tháng để theo dõi số còn lại.
      </p>
      {setupHref ? (
        <Link
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-ledger-line bg-white px-4 text-sm font-medium text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-accent"
          href={setupHref}
        >
          Thiết lập ngân sách
        </Link>
      ) : (
        <Button
          className="mt-3"
          onClick={onSetupRequested}
          type="button"
          variant="outline"
        >
          Thiết lập ngân sách
        </Button>
      )}
    </div>
  );
}

function BudgetError({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-medium text-rose-800">
        Chưa tải được ngân sách
      </p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
    </div>
  );
}

function getBudgetErrorMessage(error: unknown): string {
  if (error instanceof BudgetApiError) {
    return error.message;
  }
  return "Không tải được tình trạng ngân sách.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getProgressPercent(spentMinor: number, budgetMinor: number): number {
  if (budgetMinor <= 0) {
    return spentMinor > 0 ? 100 : 0;
  }
  return (spentMinor / budgetMinor) * 100;
}

function formatProgressPercent(value: number): string {
  return `${value.toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`;
}
