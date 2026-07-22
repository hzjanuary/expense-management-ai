import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui";

let mockedPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));

describe("multi-page navigation shell", () => {
  afterEach(() => {
    cleanup();
    mockedPathname = "/dashboard";
  });

  it("renders desktop and mobile navigation links for all five user destinations", () => {
    render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );

    for (const label of [
      "Tổng quan",
      "Giao dịch",
      "Ngân sách",
      "Trợ lý",
      "Cài đặt",
    ]) {
      expect(screen.getAllByRole("link", { name: label })).toHaveLength(2);
    }

    expect(screen.getAllByRole("navigation", { name: "Điều hướng chính" }))
      .toHaveLength(2);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("Bỏ qua điều hướng")).toBeInTheDocument();
  });

  it("marks the active route accessibly", () => {
    mockedPathname = "/assistant";

    render(
      <AppShell>
        <p>Assistant content</p>
      </AppShell>,
    );

    const currentLinks = screen
      .getAllByRole("link", { name: "Trợ lý" })
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(currentLinks).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 1, name: "Trợ lý" }))
      .toBeInTheDocument();
  });

  it("uses consistent shared button sizes and destructive semantics", () => {
    render(
      <div>
        <Button>Primary action</Button>
        <Button size="small" variant="outline">
          Secondary action
        </Button>
        <Button variant="danger">Delete record</Button>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Primary action" }).className)
      .toContain("h-10");
    expect(screen.getByRole("button", { name: "Secondary action" }).className)
      .toContain("h-9");
    expect(screen.getByRole("button", { name: "Delete record" }).className)
      .toContain("bg-rose-700");
  });
});

describe("navigation content landmarks", () => {
  afterEach(cleanup);

  it("keeps route content inside the main landmark", () => {
    render(
      <AppShell>
        <section aria-label="Route panel">Route body</section>
      </AppShell>,
    );

    expect(within(screen.getByRole("main")).getByText("Route body"))
      .toBeInTheDocument();
  });
});
