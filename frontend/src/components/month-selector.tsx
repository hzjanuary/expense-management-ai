import { isMonthValue } from "@/lib/dashboard";
import { formatMonthDisplayLabel } from "@/lib/money";

type MonthSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ledger-ink">
      <span>Tháng đang xem</span>
      <span className="relative block">
        <input
          aria-label="Tháng đang xem"
          aria-describedby="selected-month-help"
          className="h-11 w-full rounded-md border-ledger-line bg-ledger-wash text-transparent caret-transparent focus:border-ledger-focus focus:ring-ledger-focus"
          onChange={(event) => {
            const nextValue = event.target.value;
            if (isMonthValue(nextValue)) {
              onChange(nextValue);
            }
          }}
          type="month"
          value={value}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ledger-ink"
        >
          {formatMonthDisplayLabel(value)}
        </span>
      </span>
      <span className="sr-only" id="selected-month-help">
        Đổi tháng sẽ tải lại số liệu tổng quan và ngân sách.
      </span>
    </label>
  );
}
