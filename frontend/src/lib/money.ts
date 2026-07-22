export function formatVnd(amountMinor: number): string {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("amountMinor must be an integer");
  }

  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(amountMinor);

  return `${formattedAmount} ₫`;
}
