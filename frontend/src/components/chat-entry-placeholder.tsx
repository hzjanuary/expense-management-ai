export function ChatEntryPlaceholder() {
  return (
    <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-2">
          <span className="text-sm font-medium text-ledger-ink">
            Chat entry placeholder
          </span>
          <input
            aria-label="Chat entry placeholder"
            className="h-12 rounded-md border-ledger-line bg-ledger-wash text-ledger-ink placeholder:text-ledger-muted focus:border-ledger-accent focus:ring-ledger-accent"
            disabled
            placeholder="Hôm nay tôi tiêu 35k vào ăn trưa"
          />
        </label>
        <button
          className="h-12 rounded-md bg-ledger-accent px-5 text-sm font-semibold text-white opacity-60"
          disabled
          type="button"
        >
          Submit later
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-ledger-muted">
        Placeholder only. AI parse and confirmation flows are not wired in
        US-102.
      </p>
    </section>
  );
}
