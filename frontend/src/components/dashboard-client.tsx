"use client";

import { useState } from "react";

import { BudgetProgress } from "@/components/budget-progress";
import { ChatToLedger } from "@/components/chat-to-ledger";
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
    <div className="grid gap-6">
      <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ledger-ink">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-ledger-muted">
              Live local ledger data for the selected month.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <MonthSelector
              onChange={setSelectedMonth}
              value={selectedMonth}
            />
            <button
              className="h-11 rounded-md border border-ledger-line bg-white px-4 text-sm font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent"
              onClick={refreshDashboardData}
              type="button"
            >
              Refresh dashboard
            </button>
          </div>
        </div>
      </section>

      <DashboardSummary
        month={selectedMonth}
        refreshSignal={refreshRevision}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="grid gap-6">
          <ChatToLedger onTransactionConfirmed={refreshDashboardData} />
          <RecentTransactions refreshSignal={refreshRevision} />
        </div>
        <BudgetProgress month={selectedMonth} refreshSignal={refreshRevision} />
      </div>
    </div>
  );
}
