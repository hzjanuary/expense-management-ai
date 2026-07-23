"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { MonthSelector } from "@/components/month-selector";
import { RecentTransactions } from "@/components/recent-transactions";
import { TransactionExport } from "@/components/transaction-export";
import {
  Button,
  inputClassName,
  selectClassName,
} from "@/components/ui";
import {
  CATEGORY_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
  INCOME_CATEGORY_OPTIONS,
} from "@/lib/categories";
import { getCurrentMonthValue } from "@/lib/dashboard";
import { formatMonthDisplayLabel } from "@/lib/money";
import type { TransactionType } from "@/lib/transactions";

export function TransactionsClient() {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getCurrentMonthValue(),
  );
  const [category, setCategory] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [query, setQuery] = useState("");
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const transactionFilters = useMemo(
    () => ({
      category,
      month: selectedMonth,
      q: query,
      type,
    }),
    [category, query, selectedMonth, type],
  );

  function refresh() {
    setRefreshRevision((currentValue) => currentValue + 1);
  }

  function clearFilters() {
    setCategory("");
    setType("");
    setQuery("");
    setAreFiltersOpen(false);
  }

  function handleTypeChange(nextType: TransactionType | "") {
    setType(nextType);
    const allowed = categoryOptionsForType(nextType).some(
      (option) => option.slug === category,
    );
    if (!allowed) {
      setCategory("");
    }
  }

  return (
    <div className="grid gap-4">
      <section className="sr-only" aria-label="Sổ giao dịch">
        <h2>Sổ giao dịch</h2>
      </section>

      <section className="border-b border-ledger-line pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:block">
            <MonthSelector onChange={setSelectedMonth} value={selectedMonth} />
          </div>
          <label className="hidden min-w-64 gap-1 text-sm font-medium text-ledger-ink lg:grid">
            <span className="sr-only">Tìm kiếm giao dịch</span>
            <input
              className={inputClassName}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm giao dịch"
              type="search"
              value={query}
            />
          </label>
          <Button
            aria-expanded={areFiltersOpen}
            onClick={() => setAreFiltersOpen((current) => !current)}
            ref={filterButtonRef}
            type="button"
            variant="outline"
          >
            Bộ lọc
          </Button>
          <Button onClick={refresh} variant="ghost">
            Làm mới
          </Button>
          <TransactionExport compact month={selectedMonth} />
          <p className="basis-full text-sm leading-6 text-ledger-muted">
            {getFilterSummary({ category, query, selectedMonth, type })}
          </p>
        </div>

        {areFiltersOpen ? (
          <FilterPanel
            category={category}
            onCategoryChange={setCategory}
            onClose={() => setAreFiltersOpen(false)}
            onMonthChange={setSelectedMonth}
            onQueryChange={setQuery}
            onTypeChange={handleTypeChange}
            returnFocus={() => filterButtonRef.current?.focus()}
            query={query}
            selectedMonth={selectedMonth}
            type={type}
          />
        ) : null}
      </section>

      <RecentTransactions
        description="Giao dịch phù hợp với bộ lọc hiện tại."
        filters={transactionFilters}
        onTransactionDeleted={refresh}
        onClearFilters={clearFilters}
        presentation="ledger"
        refreshSignal={refreshRevision}
        hideRefreshAction
        title="Danh sách giao dịch"
      />
    </div>
  );
}

function FilterPanel({
  category,
  onCategoryChange,
  onClose,
  onMonthChange,
  onQueryChange,
  onTypeChange,
  returnFocus,
  query,
  selectedMonth,
  type,
}: {
  category: string;
  onCategoryChange: (category: string) => void;
  onClose: () => void;
  onMonthChange: (month: string) => void;
  onQueryChange: (query: string) => void;
  onTypeChange: (type: TransactionType | "") => void;
  returnFocus: () => void;
  query: string;
  selectedMonth: string;
  type: TransactionType | "";
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const controls = (
    <div className="grid gap-3 md:grid-cols-4">
      <MonthSelector onChange={onMonthChange} value={selectedMonth} />
      <label className="grid gap-1 text-sm font-medium text-ledger-ink">
        Danh mục
        <select
          className={selectClassName}
          onChange={(event) => onCategoryChange(event.target.value)}
          value={category}
        >
          <option value="">Tất cả danh mục</option>
          {categoryOptionsForType(type).map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-ledger-ink">
        Loại
        <select
          className={selectClassName}
          onChange={(event) =>
            onTypeChange(event.target.value as TransactionType | "")
          }
          value={type}
        >
          <option value="">Tất cả</option>
          <option value="expense">Chi</option>
          <option value="income">Thu</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-ledger-ink">
        Tìm kiếm
        <input
          className={inputClassName}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Ghi chú hoặc nơi giao dịch"
          type="search"
          value={query}
        />
      </label>
    </div>
  );

  return (
    <>
      <div className="mt-4 hidden border-t border-ledger-line pt-4 md:block">
        {controls}
      </div>
      <div
        className="fixed inset-0 z-40 bg-ledger-overlay/45 p-4 md:hidden"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
            returnFocus();
          }
        }}
        role="presentation"
      >
        <div
          aria-label="Bộ lọc giao dịch"
          aria-modal="true"
          className="mt-16 rounded-lg bg-ledger-panel p-4 shadow-dialog"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
              returnFocus();
            }
            if (event.key === "Tab") {
              trapFocus(event, dialogRef.current);
            }
          }}
          ref={dialogRef}
          role="dialog"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-ledger-ink">Bộ lọc</p>
            <Button
              onClick={() => {
                onClose();
                returnFocus();
              }}
              ref={closeButtonRef}
              size="small"
              type="button"
              variant="ghost"
            >
              Đóng
            </Button>
          </div>
          {controls}
        </div>
      </div>
    </>
  );
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) {
    return;
  }
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (focusable.length === 0) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function categoryOptionsForType(type: TransactionType | "") {
  if (type === "expense") {
    return EXPENSE_CATEGORY_OPTIONS;
  }
  if (type === "income") {
    return INCOME_CATEGORY_OPTIONS;
  }
  return CATEGORY_OPTIONS;
}

function getFilterSummary({
  category,
  query,
  selectedMonth,
  type,
}: {
  category: string;
  query: string;
  selectedMonth: string;
  type: TransactionType | "";
}) {
  const parts = [formatMonthDisplayLabel(selectedMonth)];
  if (category) {
    parts.push("có lọc danh mục");
  }
  if (type) {
    parts.push(type === "expense" ? "khoản chi" : "khoản thu");
  }
  if (query.trim()) {
    parts.push(`tìm "${query.trim()}"`);
  }
  return parts.join(" · ");
}
