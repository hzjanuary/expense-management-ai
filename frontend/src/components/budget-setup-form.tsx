"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  BudgetApiError,
  BudgetNotConfiguredError,
  fetchMonthlyBudget,
  upsertMonthlyBudget,
  type MonthlyBudgetResponse,
  type UpsertMonthlyBudgetRequest,
} from "@/lib/budgets";
import {
  EXPENSE_CATEGORY_OPTIONS,
  formatCategoryLabel,
  isExpenseCategorySlug,
} from "@/lib/categories";
import { formatVnd } from "@/lib/money";

type LoadState = "idle" | "loading" | "ready" | "missing" | "error";
type SubmitState = "idle" | "submitting" | "success" | "error";

type CategoryBudgetDraft = {
  id: string;
  category_slug: string;
  budget_minor: string;
};

type BudgetSetupFormProps = {
  month: string;
  currency?: string;
  onSaved: () => void;
};

type FormErrors = {
  categories?: Record<string, string>;
  form?: string;
  total_budget_minor?: string;
};

let nextRowId = 1;

function createRow(
  categorySlug = "",
  budgetMinor = "",
): CategoryBudgetDraft {
  const id = `category-budget-${nextRowId}`;
  nextRowId += 1;
  return {
    id,
    category_slug: categorySlug,
    budget_minor: budgetMinor,
  };
}

export function BudgetSetupForm({
  currency = "VND",
  month,
  onSaved,
}: BudgetSetupFormProps) {
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [totalBudgetMinor, setTotalBudgetMinor] = useState("");
  const [categoryRows, setCategoryRows] = useState<CategoryBudgetDraft[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadBudget = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;
      setLoadState("loading");
      setSubmitState("idle");
      setErrors({});
      setMessage(null);
      setTotalBudgetMinor("");
      setCategoryRows([]);

      try {
        const budget = await fetchMonthlyBudget(month, currency, signal);
        if (requestSequence.current !== requestId || signal?.aborted) {
          return;
        }
        applyBudgetResponse(budget, setTotalBudgetMinor, setCategoryRows);
        setLoadState("ready");
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        if (requestSequence.current !== requestId) {
          return;
        }
        if (error instanceof BudgetNotConfiguredError) {
          setLoadState("missing");
          setMessage("No budget configured yet. Enter a monthly budget to create one.");
          return;
        }
        setLoadState("error");
        setErrors({ form: getBudgetErrorMessage(error) });
      }
    },
    [currency, month],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadBudget(controller.signal);
    return () => controller.abort();
  }, [loadBudget]);

  const totalPreview = useMemo(() => {
    const parsed = parsePlainInteger(totalBudgetMinor);
    return parsed === null ? null : formatVnd(parsed);
  }, [totalBudgetMinor]);

  function addCategoryRow() {
    setCategoryRows((currentRows) => [...currentRows, createRow()]);
    setSubmitState("idle");
  }

  function removeCategoryRow(rowId: string) {
    setCategoryRows((currentRows) =>
      currentRows.filter((row) => row.id !== rowId),
    );
    setSubmitState("idle");
  }

  function updateCategoryRow(
    rowId: string,
    patch: Partial<Omit<CategoryBudgetDraft, "id">>,
  ) {
    setCategoryRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
    setSubmitState("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateBudgetSetupDraft({
      currency,
      total_budget_minor: totalBudgetMinor,
      category_rows: categoryRows,
    });

    if (!validation.ok) {
      setErrors(validation.errors);
      setSubmitState("idle");
      setMessage(null);
      return;
    }

    setErrors({});
    setMessage(null);
    setSubmitState("submitting");

    try {
      const savedBudget = await upsertMonthlyBudget(month, validation.request);
      applyBudgetResponse(savedBudget, setTotalBudgetMinor, setCategoryRows);
      setLoadState("ready");
      setSubmitState("success");
      setMessage("Budget saved.");
      onSaved();
    } catch (error) {
      setSubmitState("error");
      setErrors({ form: getBudgetErrorMessage(error, "Unable to save budget setup.") });
    }
  }

  return (
    <section
      aria-labelledby="budget-setup-heading"
      className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2
            className="text-lg font-semibold text-ledger-ink"
            id="budget-setup-heading"
          >
            Budget setup
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Configure monthly and expense-category budgets for {month}.
          </p>
          <p className="mt-1 text-xs text-ledger-muted">
            Changing the selected month discards unsaved edits and reloads that
            month&apos;s budget.
          </p>
        </div>
        <button
          className="h-10 rounded-md border border-ledger-line bg-white px-4 text-sm font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadState === "loading"}
          onClick={() => void loadBudget()}
          type="button"
        >
          {loadState === "loading" ? "Loading" : "Reload setup"}
        </button>
      </div>

      {loadState === "loading" || loadState === "idle" ? (
        <div className="mt-5 grid gap-3" role="status">
          <p className="text-sm font-medium text-ledger-ink">
            Loading budget setup...
          </p>
          <div className="h-20 rounded-md bg-ledger-line" />
        </div>
      ) : null}

      {loadState === "error" ? (
        <FormMessage
          message={errors.form ?? "Unable to load budget setup."}
          tone="error"
        />
      ) : null}

      {loadState === "ready" || loadState === "missing" ? (
        <form className="mt-5 grid gap-5" onSubmit={handleSubmit}>
          {message ? (
            <FormMessage
              message={message}
              tone={submitState === "success" ? "success" : "info"}
            />
          ) : null}
          {errors.form ? <FormMessage message={errors.form} tone="error" /> : null}

          <label className="grid gap-2 text-sm font-medium text-ledger-ink">
            <span>Total monthly budget ({currency})</span>
            <input
              aria-describedby="total-budget-help total-budget-error"
              className="h-11 rounded-md border-ledger-line bg-ledger-wash text-ledger-ink placeholder:text-ledger-muted focus:border-ledger-accent focus:ring-ledger-accent"
              inputMode="numeric"
              onChange={(event) => {
                setTotalBudgetMinor(event.target.value);
                setSubmitState("idle");
              }}
              placeholder="5000000"
              value={totalBudgetMinor}
            />
            <span className="text-xs text-ledger-muted" id="total-budget-help">
              Enter whole VND minor units only. Preview: {totalPreview ?? "none"}.
            </span>
            {errors.total_budget_minor ? (
              <span className="text-sm text-rose-700" id="total-budget-error">
                {errors.total_budget_minor}
              </span>
            ) : null}
          </label>

          <div className="grid gap-3">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-ledger-ink">
                  Category budgets
                </h3>
                <p className="mt-1 text-xs text-ledger-muted">
                  Optional expense-category budgets. Income categories are not
                  accepted.
                </p>
              </div>
              <button
                className="h-10 rounded-md border border-ledger-line bg-white px-4 text-sm font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent"
                onClick={addCategoryRow}
                type="button"
              >
                Add category
              </button>
            </div>

            {categoryRows.length === 0 ? (
              <div className="rounded-md border border-ledger-line bg-white p-4 text-sm text-ledger-muted">
                No category budgets configured.
              </div>
            ) : (
              <ul className="grid gap-3">
                {categoryRows.map((row, index) => (
                  <li
                    className="rounded-md border border-ledger-line bg-white p-4"
                    key={row.id}
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
                      <label className="grid gap-2 text-sm font-medium text-ledger-ink">
                        <span>Category</span>
                        <select
                          aria-describedby={`${row.id}-error`}
                          className="h-11 rounded-md border-ledger-line bg-ledger-wash text-ledger-ink focus:border-ledger-accent focus:ring-ledger-accent"
                          onChange={(event) =>
                            updateCategoryRow(row.id, {
                              category_slug: event.target.value,
                            })
                          }
                          value={row.category_slug}
                        >
                          <option value="">Select category</option>
                          {EXPENSE_CATEGORY_OPTIONS.map((category) => (
                            <option
                              key={category.slug}
                              value={category.slug}
                            >
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-ledger-ink">
                        <span>Budget ({currency})</span>
                        <input
                          aria-describedby={`${row.id}-error`}
                          className="h-11 rounded-md border-ledger-line bg-ledger-wash text-ledger-ink placeholder:text-ledger-muted focus:border-ledger-accent focus:ring-ledger-accent"
                          inputMode="numeric"
                          onChange={(event) =>
                            updateCategoryRow(row.id, {
                              budget_minor: event.target.value,
                            })
                          }
                          placeholder="2000000"
                          value={row.budget_minor}
                        />
                      </label>

                      <button
                        aria-label={`Remove category budget row ${index + 1}`}
                        className="h-11 rounded-md border border-ledger-line bg-white px-4 text-sm font-semibold text-ledger-ink transition hover:border-rose-300 hover:text-rose-700"
                        onClick={() => removeCategoryRow(row.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                    {errors.categories?.[row.id] ? (
                      <p className="mt-2 text-sm text-rose-700" id={`${row.id}-error`}>
                        {errors.categories[row.id]}
                      </p>
                    ) : null}
                    {row.category_slug && parsePlainInteger(row.budget_minor) !== null ? (
                      <p className="mt-2 text-xs text-ledger-muted">
                        {formatCategoryLabel(row.category_slug)} preview:{" "}
                        {formatVnd(parsePlainInteger(row.budget_minor) ?? 0)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              className="h-11 rounded-md bg-ledger-accent px-5 text-sm font-semibold text-white transition hover:bg-ledger-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitState === "submitting"}
              type="submit"
            >
              {submitState === "submitting" ? "Saving" : "Save budget"}
            </button>
            {submitState === "submitting" ? (
              <span className="text-sm text-ledger-muted" role="status">
                Saving budget setup...
              </span>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}

type BudgetSetupDraft = {
  category_rows: CategoryBudgetDraft[];
  currency: string;
  total_budget_minor: string;
};

type ValidationResult =
  | {
      errors: FormErrors;
      ok: false;
    }
  | {
      ok: true;
      request: UpsertMonthlyBudgetRequest;
    };

export function validateBudgetSetupDraft(
  draft: BudgetSetupDraft,
): ValidationResult {
  const errors: FormErrors = {};
  const categoryErrors: Record<string, string> = {};
  const totalBudgetMinor = parsePlainInteger(draft.total_budget_minor);

  if (totalBudgetMinor === null) {
    errors.total_budget_minor = "Enter a whole VND amount.";
  }

  const seenCategories = new Set<string>();
  const categoryBudgets = [];

  for (const row of draft.category_rows) {
    const budgetMinor = parsePlainInteger(row.budget_minor);
    if (!row.category_slug) {
      categoryErrors[row.id] = "Select an expense category.";
      continue;
    }
    if (!isExpenseCategorySlug(row.category_slug)) {
      categoryErrors[row.id] = "Select a valid expense category.";
      continue;
    }
    if (seenCategories.has(row.category_slug)) {
      categoryErrors[row.id] = "Each category can appear only once.";
      continue;
    }
    if (budgetMinor === null) {
      categoryErrors[row.id] = "Enter a whole VND amount for this category.";
      continue;
    }

    seenCategories.add(row.category_slug);
    categoryBudgets.push({
      category_slug: row.category_slug,
      budget_minor: budgetMinor,
    });
  }

  if (Object.keys(categoryErrors).length > 0) {
    errors.categories = categoryErrors;
  }

  if (totalBudgetMinor !== null) {
    const categoryTotal = categoryBudgets.reduce(
      (sum, category) => sum + category.budget_minor,
      0,
    );
    if (categoryTotal > totalBudgetMinor) {
      errors.form = "Category budgets cannot exceed the monthly total.";
    }
  }

  if (
    errors.form ||
    errors.total_budget_minor ||
    (errors.categories && Object.keys(errors.categories).length > 0)
  ) {
    return {
      errors,
      ok: false,
    };
  }

  return {
    ok: true,
    request: {
      currency: draft.currency,
      total_budget_minor: totalBudgetMinor ?? 0,
      category_budgets: categoryBudgets,
    },
  };
}

export function parsePlainInteger(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }
  return parsed;
}

function applyBudgetResponse(
  budget: MonthlyBudgetResponse,
  setTotalBudgetMinor: (value: string) => void,
  setCategoryRows: (value: CategoryBudgetDraft[]) => void,
) {
  setTotalBudgetMinor(String(budget.total_budget_minor));
  setCategoryRows(
    budget.category_budgets.map((categoryBudget) =>
      createRow(categoryBudget.category_slug, String(categoryBudget.budget_minor)),
    ),
  );
}

function FormMessage({
  message,
  tone,
}: {
  message: string;
  tone: "error" | "info" | "success";
}) {
  const className =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-ledger-line bg-white text-ledger-muted";

  return (
    <div
      className={`rounded-md border p-3 text-sm ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  );
}

function getBudgetErrorMessage(
  error: unknown,
  fallback = "Unable to load budget setup.",
): string {
  if (error instanceof BudgetApiError) {
    return error.message;
  }
  return fallback;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
