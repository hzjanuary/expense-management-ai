"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BudgetApiError,
  BudgetNotConfiguredError,
  fetchBudgetRemaining,
  type BudgetRemainingResponse,
} from "@/lib/budgets";
import { Button, panelClassName, subtlePanelClassName } from "@/components/ui";
import { formatCategoryLabel } from "@/lib/categories";
import { formatVnd } from "@/lib/money";

type LoadState = "idle" | "loading" | "loaded" | "missing" | "error";

type BudgetProgressProps = {
  month: string;
  onSetupRequested: () => void;
  refreshSignal: number;
  setupHref?: string;
};

export function BudgetProgress({
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
            Budget status
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Backend-computed budget remaining for {month}.
          </p>
        </div>
        <Button
          disabled={state === "loading" || state === "idle"}
          onClick={() => void loadBudget()}
          type="button"
          variant="outline"
        >
          {state === "loading" || state === "idle" ? "Loading" : "Retry budget"}
        </Button>
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
          onSetupRequested={onSetupRequested}
          setupHref={setupHref}
        />
      ) : null}
    </section>
  );
}

function BudgetLoaded({
  budget,
  onSetupRequested,
  setupHref,
}: {
  budget: BudgetRemainingResponse;
  onSetupRequested: () => void;
  setupHref?: string;
}) {
  const isTotalOverBudget = budget.total_remaining_minor < 0;

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <BudgetMetric
          label="Total budget"
          value={formatVnd(budget.total_budget_minor)}
        />
        <BudgetMetric
          label="Spent"
          tone="expense"
          value={formatVnd(budget.total_expense_minor)}
        />
        <BudgetMetric
          label="Remaining"
          note={isTotalOverBudget ? "Over budget" : "Available"}
          tone={isTotalOverBudget ? "expense" : "income"}
          value={formatVnd(budget.total_remaining_minor)}
        />
      </div>

      {budget.categories.length === 0 ? (
        <div className="rounded-md border border-ledger-line bg-white p-4">
          <p className="text-sm font-medium text-ledger-ink">
            No category budgets configured.
          </p>
          <p className="mt-1 text-sm text-ledger-muted">
            Add category budgets to track specific spending areas.
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
                    {category.is_over_budget ? "Over budget" : "Within budget"}
                  </span>
                </div>
                <dl className="grid gap-2 text-xs text-ledger-muted sm:grid-cols-3">
                  <CategoryMetric
                    label="Budget"
                    value={formatVnd(category.budget_minor)}
                  />
                  <CategoryMetric
                    label="Spent"
                    value={formatVnd(category.spent_minor)}
                  />
                  <CategoryMetric
                    label="Remaining"
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
        Edit budget
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
      Edit budget
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
    <div className={subtlePanelClassName}>
      <p className="text-xs font-medium uppercase text-ledger-muted">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${valueTone}`}>{value}</p>
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
        Loading budget status...
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
        No budget configured for this month.
      </p>
      <p className="mt-1 text-sm text-ledger-muted">
        Create a total monthly budget and optional category budgets.
      </p>
      {setupHref ? (
        <Link
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-ledger-line bg-white px-4 text-sm font-medium text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-accent"
          href={setupHref}
        >
          Set up budget
        </Link>
      ) : (
        <Button
          className="mt-3"
          onClick={onSetupRequested}
          type="button"
          variant="outline"
        >
          Set up budget
        </Button>
      )}
    </div>
  );
}

function BudgetError({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-medium text-rose-800">
        Budget status unavailable
      </p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
    </div>
  );
}

function getBudgetErrorMessage(error: unknown): string {
  if (error instanceof BudgetApiError) {
    return error.message;
  }
  return "Unable to load budget status.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
