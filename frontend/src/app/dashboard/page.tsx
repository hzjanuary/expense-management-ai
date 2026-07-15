import { AppShell } from "@/components/app-shell";
import { BudgetSettingsPlaceholder } from "@/components/budget-settings-placeholder";
import { ChatEntryPlaceholder } from "@/components/chat-entry-placeholder";
import { DashboardSummaryCards } from "@/components/dashboard-summary-cards";
import { TransactionHistoryPlaceholder } from "@/components/transaction-history-placeholder";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <DashboardSummaryCards />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="grid gap-6">
            <ChatEntryPlaceholder />
            <TransactionHistoryPlaceholder />
          </div>
          <BudgetSettingsPlaceholder />
        </div>
      </div>
    </AppShell>
  );
}
