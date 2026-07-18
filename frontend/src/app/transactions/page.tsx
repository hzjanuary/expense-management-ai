import { AppShell } from "@/components/app-shell";
import { TransactionsClient } from "@/components/transactions-client";

export default function TransactionsPage() {
  return (
    <AppShell>
      <TransactionsClient />
    </AppShell>
  );
}
