export function formatVnd(amountMinor: number): string {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("amountMinor must be an integer");
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amountMinor);
}
