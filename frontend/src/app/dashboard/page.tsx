import { AppShell } from "@/components/app-shell";
import { DashboardClient } from "@/components/dashboard-client";
import { DashboardSummaryCards } from "@/components/dashboard-summary-cards";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <DashboardSummaryCards />
        <DashboardClient />
      </div>
    </AppShell>
  );
}
