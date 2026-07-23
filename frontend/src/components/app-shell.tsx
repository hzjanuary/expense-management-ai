"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { APP_ROUTES, findAppRoute, type AppRoute } from "@/lib/navigation";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const currentRoute = findAppRoute(pathname);

  return (
    <div className="min-h-screen bg-ledger-wash text-ledger-ink">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-ledger-panel focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ledger-ink focus:shadow-soft"
        href="#main-content"
      >
        Bỏ qua điều hướng
      </a>
      <DesktopSidebar pathname={pathname} />
      <div className="min-h-screen pb-24 lg:pl-[232px] lg:pb-0">
        <div className="mx-auto grid w-full max-w-[1240px] gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <PageHeader route={currentRoute} />
          <main
            className="min-w-0"
            id="main-content"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNavigation pathname={pathname} />
    </div>
  );
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[232px] border-r border-ledger-line bg-ledger-panel px-4 py-5 lg:block">
      <div className="grid h-full gap-6">
        <BrandLockup />
        <nav aria-label="Điều hướng chính">
          <ul className="grid gap-1">
            {APP_ROUTES.map((route) => (
              <li key={route.href}>
                <NavigationLink pathname={pathname} route={route} />
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto border-t border-ledger-line pt-4 text-xs leading-5 text-ledger-muted">
          Dữ liệu lưu trên máy này. Trợ lý không tự ghi giao dịch.
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ledger-line bg-ledger-panel/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-soft backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5 gap-1">
        {APP_ROUTES.map((route) => {
          const isActive = pathname.startsWith(route.href);
          return (
            <li key={route.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={[
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[0.68rem] font-semibold leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-focus",
                  isActive
                    ? "bg-ledger-accent-soft text-ledger-accent before:absolute before:top-1 before:h-0.5 before:w-6 before:rounded-full before:bg-ledger-accent"
                    : "text-ledger-muted hover:bg-ledger-wash hover:text-ledger-ink",
                ].join(" ")}
                href={route.href}
              >
                <NavigationIcon name={route.icon} />
                <span>{route.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavigationLink({
  pathname,
  route,
}: {
  pathname: string;
  route: AppRoute;
}) {
  const isActive = pathname.startsWith(route.href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={[
        "flex min-h-10 items-center gap-3 rounded-md border-l-4 px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-focus",
        isActive
          ? "border-ledger-accent bg-ledger-accent-soft text-ledger-accent"
          : "border-transparent text-ledger-muted hover:bg-ledger-wash hover:text-ledger-ink",
      ].join(" ")}
      href={route.href}
    >
      <NavigationIcon name={route.icon} />
      <span>{route.label}</span>
    </Link>
  );
}

function PageHeader({ route }: { route: AppRoute }) {
  return (
    <header className="py-1">
      <h1 className="text-2xl font-semibold tracking-normal text-ledger-ink sm:text-3xl">
        {route.label}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ledger-muted sm:text-base">
        {route.description}
      </p>
    </header>
  );
}

function BrandLockup() {
  return (
    <Link
      className="flex items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-focus"
      href="/dashboard"
    >
      <span className="grid h-9 w-9 place-items-center rounded-md bg-ledger-accent text-white">
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M5 8.5A2.5 2.5 0 0 1 7.5 6H18a1 1 0 0 1 1 1v10.5a1.5 1.5 0 0 1-1.5 1.5h-10A2.5 2.5 0 0 1 5 16.5v-8Z" />
          <path d="M5 8.5A2.5 2.5 0 0 0 7.5 11H19" />
          <path d="M15 15h2" />
        </svg>
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-normal text-ledger-ink">
          Pocket Ledger
        </span>
        <span className="block text-xs leading-5 text-ledger-muted">
          Sổ tiền cá nhân
        </span>
      </span>
    </Link>
  );
}

function NavigationIcon({ name }: { name: AppRoute["icon"] }) {
  const path = {
    assistant:
      "M6 7h12v8H8l-4 4V9a2 2 0 0 1 2-2Zm4 3h6M8 13h5",
    budgets:
      "M5 19V5h14v14H5Zm3-10h8M8 13h4M8 16h7",
    home: "M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4v-8.5Z",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
    transactions:
      "M5 7h14M5 12h14M5 17h14M8 5v4M16 10v4M11 15v4",
  }[name];

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}
