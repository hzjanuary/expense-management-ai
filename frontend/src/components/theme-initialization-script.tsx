import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeInitializationScript() {
  const code = `
(function() {
  try {
    var key = "${THEME_STORAGE_KEY}";
    var stored = window.localStorage.getItem(key);
    var mode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = mode === "dark" || (mode === "system" && prefersDark) ? "dark" : "light";
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    root.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themeMode = "system";
    document.documentElement.style.colorScheme = "light";
  }
})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
