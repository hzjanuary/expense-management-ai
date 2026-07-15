import { appConfig } from "@/lib/config";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col justify-between gap-4 rounded-lg border border-ledger-line bg-ledger-panel/90 px-5 py-5 shadow-soft backdrop-blur sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-ledger-ink">
              Pocket Ledger AI
            </h1>
            <p className="mt-1 text-sm text-ledger-muted">
              Local-first AI expense manager
            </p>
          </div>
          <div className="rounded-md border border-ledger-line bg-ledger-wash px-3 py-2 text-xs text-ledger-muted">
            API: {appConfig.apiBaseUrl}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
