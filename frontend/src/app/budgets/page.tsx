import { AppShell } from "@/components/app-shell";
import { BudgetsClient } from "@/components/budgets-client";

export default function BudgetsPage() {
  return (
    <AppShell>
      <BudgetsClient />
    </AppShell>
  );
}
