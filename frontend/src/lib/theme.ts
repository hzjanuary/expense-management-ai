export const THEME_STORAGE_KEY = "pocket-ledger-theme";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_OPTIONS: Array<{ label: string; value: ThemeMode }> = [
  { label: "Theo hệ thống", value: "system" },
  { label: "Sáng", value: "light" },
  { label: "Tím đen", value: "dark" },
];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveThemeMode(
  mode: ThemeMode,
  prefersDark: boolean,
): ResolvedTheme {
  if (mode === "dark") {
    return "dark";
  }
  if (mode === "light") {
    return "light";
  }
  return prefersDark ? "dark" : "light";
}
