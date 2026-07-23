import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsClient } from "@/components/settings-client";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function ThemeProbe() {
  const { mode, resolvedTheme } = useTheme();
  return (
    <div>
      <p>mode:{mode}</p>
      <p>resolved:{resolvedTheme}</p>
    </div>
  );
}

describe("theme provider", () => {
  let mediaListeners: Array<(event: MediaQueryListEvent) => void> = [];
  let systemPrefersDark = false;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.removeAttribute("style");
    mediaListeners = [];
    systemPrefersDark = false;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string): MediaQueryList => ({
        addEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => {
          mediaListeners.push(listener as (event: MediaQueryListEvent) => void);
        },
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: systemPrefersDark,
        media: query,
        onchange: null,
        removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => {
          mediaListeners = mediaListeners.filter(
            (current) => current !== listener,
          );
        },
        removeListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("defaults to system mode and applies resolved light theme", async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(await screen.findByText("mode:system")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("light"),
    );
    expect(document.documentElement.dataset.themeMode).toBe("system");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("persists explicit light and dark selections from settings", async () => {
    render(
      <ThemeProvider>
        <SettingsClient />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByLabelText("Tím đen"));
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await userEvent.click(screen.getByLabelText("Sáng"));
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("light"),
    );
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("restores stored preference and falls back from invalid stored values", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const { unmount } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(await screen.findByText("mode:dark")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );
    unmount();

    localStorage.setItem(THEME_STORAGE_KEY, "purple");
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(await screen.findByText("mode:system")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.documentElement.dataset.themeMode).toBe("system"),
    );
  });

  it("tracks system preference changes only while mode is system", async () => {
    render(
      <ThemeProvider>
        <SettingsClient />
        <ThemeProbe />
      </ThemeProvider>,
    );

    emitSystemPreference(true);
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );

    await userEvent.click(screen.getByLabelText("Sáng"));
    emitSystemPreference(true);
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("light"),
    );

    await userEvent.click(screen.getByLabelText("Tím đen"));
    emitSystemPreference(false);
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );
  });

  it("supports keyboard selection in the appearance control", async () => {
    render(
      <ThemeProvider>
        <SettingsClient />
      </ThemeProvider>,
    );

    const darkOption = screen.getByLabelText("Tím đen");
    darkOption.focus();
    await userEvent.keyboard("[Space]");

    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );
    expect(darkOption).toBeChecked();
  });

  it("does not emit hydration warnings during client render", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).toLowerCase().includes("hydration"),
      ),
    ).toBe(false);
  });

  it("does not render raw light-only surface utility classes in settings", async () => {
    render(
      <ThemeProvider>
        <SettingsClient />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByLabelText("Tím đen"));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.body.innerHTML).not.toMatch(/bg-white|bg-amber|bg-rose/);
  });

  function emitSystemPreference(matches: boolean) {
    systemPrefersDark = matches;
    const event = { matches } as MediaQueryListEvent;
    mediaListeners.forEach((listener) => listener(event));
  }
});
