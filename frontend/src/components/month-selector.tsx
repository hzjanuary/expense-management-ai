import { isMonthValue } from "@/lib/dashboard";

type MonthSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ledger-ink">
      <span>Selected month</span>
      <input
        aria-label="Selected month"
        aria-describedby="selected-month-help"
        className="h-11 rounded-md border-ledger-line bg-ledger-wash text-ledger-ink focus:border-ledger-accent focus:ring-ledger-accent"
        onChange={(event) => {
          const nextValue = event.target.value;
          if (isMonthValue(nextValue)) {
            onChange(nextValue);
          }
        }}
        type="month"
        value={value}
      />
      <span className="sr-only" id="selected-month-help">
        Changing the selected month refreshes dashboard summary and budget data.
      </span>
    </label>
  );
}
