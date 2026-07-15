import { formatVnd } from "@/lib/money";

const summaryItems = [
  {
    label: "Current balance",
    value: formatVnd(0),
    note: "Placeholder until dashboard API wiring",
  },
  {
    label: "Monthly income",
    value: formatVnd(0),
    note: "Static shell value",
  },
  {
    label: "Monthly expense",
    value: formatVnd(0),
    note: "Static shell value",
  },
  {
    label: "Remaining budget",
    value: formatVnd(0),
    note: "Budget progress comes later",
  },
];

export function DashboardSummaryCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryItems.map((item) => (
        <article
          className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft"
          key={item.label}
        >
          <p className="text-sm font-medium text-ledger-muted">{item.label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-normal text-ledger-ink">
            {item.value}
          </p>
          <p className="mt-3 text-xs leading-5 text-ledger-muted">{item.note}</p>
        </article>
      ))}
    </section>
  );
}
