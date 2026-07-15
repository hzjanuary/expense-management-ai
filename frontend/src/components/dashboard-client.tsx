"use client";

import { useState } from "react";

import { BudgetSettingsPlaceholder } from "@/components/budget-settings-placeholder";
import { ChatToLedger } from "@/components/chat-to-ledger";
import { RecentTransactions } from "@/components/recent-transactions";

export function DashboardClient() {
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <div className="grid gap-6">
        <ChatToLedger
          onTransactionConfirmed={() =>
            setTransactionRefreshKey((currentKey) => currentKey + 1)
          }
        />
        <RecentTransactions refreshSignal={transactionRefreshKey} />
      </div>
      <BudgetSettingsPlaceholder />
    </div>
  );
}
