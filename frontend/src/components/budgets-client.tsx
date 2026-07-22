"use client";

import { useState } from "react";

import { BudgetProgress } from "@/components/budget-progress";
import { BudgetSetupForm } from "@/components/budget-setup-form";
import { MonthSelector } from "@/components/month-selector";
import { Button } from "@/components/ui";
import { getCurrentMonthValue } from "@/lib/dashboard";

export function BudgetsClient() {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getCurrentMonthValue(),
  );
  const [refreshRevision, setRefreshRevision] = useState(0);

  function refresh() {
    setRefreshRevision((currentValue) => currentValue + 1);
  }

  return (
    <div className="grid gap-5">
      <section className="border-b border-ledger-line pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ledger-ink">
              Ngân sách theo tháng
            </h2>
            <p className="mt-1 text-sm leading-6 text-ledger-muted">
              Thiết lập ngân sách tổng và ngân sách từng danh mục chi tiêu.
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
      <BudgetProgress
        month={selectedMonth}
        onSetupRequested={() => undefined}
        refreshSignal={refreshRevision}
      />
      <section className="border-t border-ledger-line pt-5">
        <BudgetSetupForm month={selectedMonth} onSaved={refresh} />
      </section>
    </div>
  );
}
