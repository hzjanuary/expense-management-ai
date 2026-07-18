"use client";

import { useMemo, useState } from "react";

import { MonthSelector } from "@/components/month-selector";
import { RecentTransactions } from "@/components/recent-transactions";
import { TransactionExport } from "@/components/transaction-export";
import {
  Button,
  inputClassName,
  panelClassName,
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

  return (
    <div className="grid gap-5">
      <section className={panelClassName}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ledger-ink">
              Danh sách và xuất dữ liệu
            </h2>
            <p className="mt-1 text-sm leading-6 text-ledger-muted">
              Xóa mềm giao dịch sai và tải CSV/JSON từ dữ liệu cục bộ.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <MonthSelector onChange={setSelectedMonth} value={selectedMonth} />
            <Button onClick={refresh} size="large" variant="outline">
              Làm mới
            </Button>
          </div>
        </div>
      </section>
      <section className={panelClassName}>
        <h2 className="text-lg font-semibold text-ledger-ink">
          Bộ lọc giao dịch
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Danh mục
            <select
              className={selectClassName}
              onChange={(event) => setCategory(event.target.value)}
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
                setType(event.target.value as TransactionType | "")
              }
              value={type}
            >
              <option value="">Tất cả</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Tìm kiếm
            <input
              className={inputClassName}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mô tả hoặc merchant"
              type="search"
              value={query}
            />
          </label>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <RecentTransactions
          filters={transactionFilters}
          onTransactionDeleted={refresh}
          refreshSignal={refreshRevision}
        />
        <TransactionExport month={selectedMonth} />
      </div>
    </div>
  );
}
