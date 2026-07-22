"use client";

import { useMemo, useState } from "react";

import { MonthSelector } from "@/components/month-selector";
import { RecentTransactions } from "@/components/recent-transactions";
import { TransactionExport } from "@/components/transaction-export";
import {
  Button,
  inputClassName,
  selectClassName,
} from "@/components/ui";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/categories";
import { getCurrentMonthValue } from "@/lib/dashboard";
import type { TransactionType } from "@/lib/transactions";

export function TransactionsClient() {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getCurrentMonthValue(),
  );
  const [category, setCategory] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [query, setQuery] = useState("");
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
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
            onTypeChange={setType}
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
  query: string;
  selectedMonth: string;
  type: TransactionType | "";
}) {
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
          {EXPENSE_CATEGORY_OPTIONS.map((option) => (
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
      <div className="fixed inset-0 z-40 bg-black/30 p-4 md:hidden" role="presentation">
        <div
          aria-label="Bộ lọc giao dịch"
          className="mt-16 rounded-lg bg-white p-4 shadow-dialog"
          role="dialog"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-ledger-ink">Bộ lọc</p>
            <Button onClick={onClose} size="small" type="button" variant="ghost">
              Đóng
            </Button>
          </div>
          {controls}
        </div>
      </div>
    </>
  );
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
  const parts = [`Tháng ${selectedMonth}`];
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
