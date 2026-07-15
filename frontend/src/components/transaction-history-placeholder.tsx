const rows = [
  { label: "No transactions loaded", meta: "History API wiring comes later" },
  { label: "Manual and AI-created records", meta: "Will appear after US-403" },
];

export function TransactionHistoryPlaceholder() {
  return (
    <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-ledger-ink">
          Transaction history
        </h2>
        <span className="text-xs font-medium text-ledger-muted">Placeholder</span>
      </div>
      <div className="mt-4 divide-y divide-ledger-line rounded-md border border-ledger-line">
        {rows.map((row) => (
          <div className="grid gap-1 bg-white px-4 py-3" key={row.label}>
            <p className="text-sm font-medium text-ledger-ink">{row.label}</p>
            <p className="text-xs text-ledger-muted">{row.meta}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
