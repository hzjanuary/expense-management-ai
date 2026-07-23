type VndSign = "auto" | "none" | "positive" | "negative";

type FormatVndOptions = {
  sign?: VndSign;
};

export function formatVnd(
  amountMinor: number,
  { sign = "auto" }: FormatVndOptions = {},
): string {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("amountMinor must be an integer");
  }

  const signPrefix = getSignPrefix(amountMinor, sign);
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Math.abs(amountMinor));

  return `${signPrefix}${formattedAmount} ₫`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "0,00%";
  }

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}%`;
}

export function formatMonthDisplayLabel(value: string): string {
  const date = createMonthDate(value);
  if (!date) {
    return "Tháng này";
  }

  const month = new Intl.DateTimeFormat("vi-VN", {
    month: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  const year = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(date);

  return `Tháng ${month}, ${year}`;
}

function getSignPrefix(amountMinor: number, sign: VndSign): string {
  if (sign === "positive") {
    return "+";
  }
  if (sign === "negative") {
    return "−";
  }
  if (sign === "none") {
    return "";
  }
  return amountMinor < 0 ? "−" : "";
}

function createMonthDate(value: string): Date | null {
  const monthValue = /^(\d{4})-(\d{2})$/.exec(value);
  if (monthValue) {
    const year = Number(monthValue[1]);
    const month = Number(monthValue[2]);
    if (Number.isInteger(year) && Number.isInteger(month)) {
      return new Date(Date.UTC(year, month - 1, 15));
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
