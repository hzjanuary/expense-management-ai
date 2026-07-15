import { formatVnd } from "@/lib/money";

const categoryBudgets = [
  { category: "food", amount: 0 },
  { category: "transport", amount: 0 },
  { category: "coffee", amount: 0 },
];

export function BudgetSettingsPlaceholder() {
  return (
    <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold text-ledger-ink">
          Budget settings
        </h2>
        <p className="mt-1 text-sm text-ledger-muted">
          Static setup preview. Form submission is reserved for a later story.
        </p>
      </div>
      <div className="mt-5 grid gap-3">
        <div className="rounded-md border border-ledger-line bg-ledger-wash p-4">
          <p className="text-xs font-medium uppercase text-ledger-muted">
            Monthly budget
          </p>
          <p className="mt-2 text-xl font-semibold text-ledger-ink">
            {formatVnd(0)}
          </p>
        </div>
        {categoryBudgets.map((item) => (
          <div
            className="flex items-center justify-between rounded-md border border-ledger-line bg-white px-4 py-3"
            key={item.category}
          >
            <span className="text-sm font-medium text-ledger-ink">
              {item.category}
            </span>
            <span className="text-sm text-ledger-muted">
              {formatVnd(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
