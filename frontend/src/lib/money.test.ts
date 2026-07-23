import { describe, expect, it } from "vitest";

import { formatMonthDisplayLabel, formatPercent, formatVnd } from "@/lib/money";

describe("Vietnamese display formatters", () => {
  it("formats VND with the actual dong symbol and canonical spacing", () => {
    expect(formatVnd(4_075_000)).toBe("4.075.000 ₫");
    expect(formatVnd(-4_075_000)).toBe("−4.075.000 ₫");
    expect(formatVnd(0, { sign: "positive" })).toBe("+0 ₫");
  });

  it("formats percentages and month labels for vi-VN product copy", () => {
    expect(formatPercent(98.16)).toBe("98,16%");
    expect(formatMonthDisplayLabel("2026-07")).toBe("Tháng 7, 2026");
    expect(formatMonthDisplayLabel("2026-06-30T17:00:00Z")).toBe("Tháng 7, 2026");
  });
});
