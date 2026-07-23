"use client";

import Link from "next/link";
import { useState } from "react";

import { BudgetProgress } from "@/components/budget-progress";
import { Button } from "@/components/ui";
import {
  DashboardCategoryBreakdown,
  DashboardSummary,
} from "@/components/dashboard-summary";
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
      <section className="order-2 border-b border-ledger-line pb-5 lg:order-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2 lg:pb-1">
              <QuickAction href="/assistant" label="Thêm giao dịch" />
              <QuickAction href="/budgets" label="Sửa ngân sách" />
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

      <div className="order-1 lg:order-none">
        <DashboardSummary
          month={selectedMonth}
          refreshSignal={refreshRevision}
        />
      </div>

      <BudgetProgress
        compact
        month={selectedMonth}
        onSetupRequested={() => undefined}
        refreshSignal={refreshRevision}
        setupHref="/budgets"
      />

      <div className="grid gap-5 border-t border-ledger-line pt-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <DashboardCategoryBreakdown
          month={selectedMonth}
          refreshSignal={refreshRevision}
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
  href: "/assistant" | "/budgets";
  label: string;
}) {
  return (
    <Link
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-ledger-line bg-ledger-panel px-3 text-center text-sm font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-focus"
      href={href}
    >
      {label}
    </Link>
  );
}
