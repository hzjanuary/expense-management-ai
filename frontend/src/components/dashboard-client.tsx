"use client";

import Link from "next/link";
import { useState } from "react";

import { BudgetProgress } from "@/components/budget-progress";
import { Button, panelClassName } from "@/components/ui";
import { DashboardSummary } from "@/components/dashboard-summary";
import { MonthSelector } from "@/components/month-selector";
import { RecentTransactions } from "@/components/recent-transactions";
import { getCurrentMonthValue } from "@/lib/dashboard";

export function DashboardClient() {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getCurrentMonthValue(),
  );
  const [refreshRevision, setRefreshRevision] = useState(0);

  function refreshDashboardData() {
    setRefreshRevision((currentRevision) => currentRevision + 1);
  }

  return (
    <div className="grid gap-5">
      <section className={panelClassName}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ledger-ink">
              Tổng quan tháng
            </h2>
            <p className="mt-1 text-sm leading-6 text-ledger-muted">
              Xem nhanh số dư, thu chi và ngân sách. Các thao tác chi tiết nằm
              ở từng trang riêng.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <MonthSelector onChange={setSelectedMonth} value={selectedMonth} />
            <Button
              onClick={refreshDashboardData}
              size="large"
              type="button"
              variant="outline"
            >
              Làm mới
            </Button>
          </div>
        </div>
      </section>

      <DashboardSummary
        month={selectedMonth}
        refreshSignal={refreshRevision}
      />

      <section className={panelClassName}>
        <h2 className="text-lg font-semibold text-ledger-ink">Thao tác nhanh</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction href="/assistant" label="Thêm giao dịch" />
          <QuickAction href="/budgets" label="Thiết lập ngân sách" />
          <QuickAction href="/assistant" label="Hỏi trợ lý" />
          <QuickAction href="/transactions" label="Xem giao dịch" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <BudgetProgress
          month={selectedMonth}
          onSetupRequested={() => undefined}
          refreshSignal={refreshRevision}
          setupHref="/budgets"
        />
        <RecentTransactions
          hideDeleteActions
          onTransactionDeleted={refreshDashboardData}
          refreshSignal={refreshRevision}
        />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
}: {
  href: "/assistant" | "/budgets" | "/transactions";
  label: string;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-ledger-line bg-ledger-wash px-4 text-center text-sm font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-accent"
      href={href}
    >
      {label}
    </Link>
  );
}
