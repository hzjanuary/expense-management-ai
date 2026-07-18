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
import { Button, inputLargeClassName, selectLargeClassName } from "@/components/ui";

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
          setMessage("Chưa thiết lập ngân sách. Nhập ngân sách tháng để bắt đầu.");
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
      setMessage("Đã lưu ngân sách.");
      onSaved();
    } catch (error) {
      setSubmitState("error");
      setErrors({ form: getBudgetErrorMessage(error, "Không lưu được ngân sách.") });
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
            Thiết lập ngân sách
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Nhập ngân sách tháng và ngân sách cho từng danh mục chi tiêu.
          </p>
          <p className="mt-1 text-xs text-ledger-muted">
            Khi đổi tháng, các chỉnh sửa chưa lưu sẽ bị bỏ và biểu mẫu sẽ tải
            ngân sách của tháng mới.
          </p>
        </div>
        <Button
          disabled={loadState === "loading"}
          onClick={() => void loadBudget()}
          type="button"
          variant="outline"
        >
          {loadState === "loading" ? "Đang tải" : "Tải lại"}
        </Button>
      </div>

      {loadState === "loading" || loadState === "idle" ? (
        <div className="mt-5 grid gap-3" role="status">
          <p className="text-sm font-medium text-ledger-ink">
            Đang tải biểu mẫu ngân sách...
          </p>
          <div className="h-20 rounded-md bg-ledger-line" />
        </div>
      ) : null}

      {loadState === "error" ? (
        <FormMessage
          message={errors.form ?? "Không tải được biểu mẫu ngân sách."}
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
            <span>Ngân sách tháng ({currency})</span>
            <input
              aria-describedby="total-budget-help total-budget-error"
              className={inputLargeClassName}
              inputMode="numeric"
              onChange={(event) => {
                setTotalBudgetMinor(event.target.value);
                setSubmitState("idle");
              }}
              placeholder="5000000"
              value={totalBudgetMinor}
            />
            <span className="text-xs text-ledger-muted" id="total-budget-help">
              Chỉ nhập số nguyên VND. Xem trước: {totalPreview ?? "chưa có"}.
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
                  Ngân sách danh mục
                </h3>
                <p className="mt-1 text-xs text-ledger-muted">
                  Chỉ chọn danh mục chi tiêu. Tổng các dòng không được vượt
                  ngân sách tháng.
                </p>
              </div>
              <Button
                onClick={addCategoryRow}
                type="button"
                variant="outline"
              >
                Thêm danh mục
              </Button>
            </div>

            {categoryRows.length === 0 ? (
              <div className="rounded-md border border-ledger-line bg-white p-4 text-sm text-ledger-muted">
                Chưa có ngân sách danh mục. Bạn có thể lưu ngân sách tháng
                trước rồi bổ sung sau.
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
                        <span>Danh mục</span>
                        <select
                          aria-describedby={`${row.id}-error`}
                          className={selectLargeClassName}
                          onChange={(event) =>
                            updateCategoryRow(row.id, {
                              category_slug: event.target.value,
                            })
                          }
                          value={row.category_slug}
                        >
                          <option value="">Chọn danh mục</option>
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
                        <span>Ngân sách ({currency})</span>
                        <input
                          aria-describedby={`${row.id}-error`}
                          className={inputLargeClassName}
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

                      <Button
                        aria-label={`Xóa dòng ngân sách danh mục ${index + 1}`}
                        onClick={() => removeCategoryRow(row.id)}
                        type="button"
                        variant="outline"
                      >
                        Xóa dòng
                      </Button>
                    </div>
                    {errors.categories?.[row.id] ? (
                      <p className="mt-2 text-sm text-rose-700" id={`${row.id}-error`}>
                        {errors.categories[row.id]}
                      </p>
                    ) : null}
                    {row.category_slug && parsePlainInteger(row.budget_minor) !== null ? (
                      <p className="mt-2 text-xs text-ledger-muted">
                        Xem trước {formatCategoryLabel(row.category_slug)}:{" "}
                        {formatVnd(parsePlainInteger(row.budget_minor) ?? 0)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              disabled={submitState === "submitting"}
              size="large"
              type="submit"
            >
              {submitState === "submitting" ? "Đang lưu" : "Lưu ngân sách"}
            </Button>
            {submitState === "submitting" ? (
              <span className="text-sm text-ledger-muted" role="status">
                Đang lưu ngân sách...
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
    errors.total_budget_minor = "Nhập số VND nguyên, không dùng dấu phẩy hoặc số lẻ.";
  }

  const seenCategories = new Set<string>();
  const categoryBudgets = [];

  for (const row of draft.category_rows) {
    const budgetMinor = parsePlainInteger(row.budget_minor);
    if (!row.category_slug) {
      categoryErrors[row.id] = "Chọn một danh mục chi tiêu.";
      continue;
    }
    if (!isExpenseCategorySlug(row.category_slug)) {
      categoryErrors[row.id] = "Danh mục này không hợp lệ cho chi tiêu.";
      continue;
    }
    if (seenCategories.has(row.category_slug)) {
      categoryErrors[row.id] = "Mỗi danh mục chỉ được nhập một lần.";
      continue;
    }
    if (budgetMinor === null) {
      categoryErrors[row.id] = "Nhập số VND nguyên cho danh mục này.";
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
      errors.form = "Tổng ngân sách danh mục không được vượt ngân sách tháng.";
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
  fallback = "Không tải được biểu mẫu ngân sách.",
): string {
  if (error instanceof BudgetApiError) {
    if (error instanceof BudgetNotConfiguredError) {
      return "Chưa thiết lập ngân sách cho tháng này.";
    }
    if (error.message.toLowerCase().includes("validation")) {
      return "Thông tin ngân sách chưa hợp lệ. Hãy kiểm tra lại các ô nhập.";
    }
    return fallback;
  }
  return fallback;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
