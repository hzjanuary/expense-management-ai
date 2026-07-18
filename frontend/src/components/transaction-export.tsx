"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/categories";
import {
  buildTransactionExportUrl,
  DataManagementApiError,
  readDataManagementError,
  type TransactionExportFormat,
} from "@/lib/data-management";
import type { TransactionType } from "@/lib/transactions";

type TransactionExportProps = {
  month: string;
};

export function TransactionExport({ month }: TransactionExportProps) {
  const abortRef = useRef<AbortController | null>(null);
  const [format, setFormat] = useState<TransactionExportFormat>("csv");
  const [exportMonth, setExportMonth] = useState(month);
  const [category, setCategory] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [query, setQuery] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setExportMonth(month);
  }, [month]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDownloading) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsDownloading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = buildTransactionExportUrl({
        category,
        format,
        month: exportMonth,
        q: query,
        type,
      });
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new DataManagementApiError(
          await readDataManagementError(
            response,
            "Unable to download transaction export.",
          ),
          response.status,
        );
      }

      const blob = await response.blob();
      const filename = getFilenameFromDisposition(
        response.headers.get("Content-Disposition"),
        format,
      );
      downloadBlob(blob, filename);
      setSuccess(`Started ${format.toUpperCase()} download.`);
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }
      if (caughtError instanceof DataManagementApiError) {
        setError(caughtError.message);
      } else {
        setError("Unable to download transaction export.");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsDownloading(false);
    }
  }

  return (
    <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold text-ledger-ink">
          Export Transactions
        </h2>
        <p className="mt-1 text-sm text-ledger-muted">
          Download a filtered ledger export from the local backend.
        </p>
      </div>

      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Format
            <select
              className="h-10 rounded-md border border-ledger-line bg-white px-3 text-sm"
              onChange={(event) =>
                setFormat(event.target.value as TransactionExportFormat)
              }
              value={format}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Month
            <input
              className="h-10 rounded-md border border-ledger-line bg-white px-3 text-sm"
              onChange={(event) => setExportMonth(event.target.value)}
              type="month"
              value={exportMonth}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Category
            <select
              className="h-10 rounded-md border border-ledger-line bg-white px-3 text-sm"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="">All categories</option>
              {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Type
            <select
              className="h-10 rounded-md border border-ledger-line bg-white px-3 text-sm"
              onChange={(event) => setType(event.target.value as TransactionType | "")}
              value={type}
            >
              <option value="">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium text-ledger-ink">
          Search text
          <input
            className="h-10 rounded-md border border-ledger-line bg-white px-3 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Description or merchant"
            type="search"
            value={query}
          />
        </label>

        {error ? (
          <p className="text-sm font-medium text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm font-medium text-ledger-accent" role="status">
            {success}
          </p>
        ) : null}

        <button
          className="h-10 rounded-md bg-ledger-accent px-4 text-sm font-semibold text-white transition hover:bg-ledger-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDownloading}
          type="submit"
        >
          {isDownloading ? "Preparing download" : "Download export"}
        </button>
      </form>
    </section>
  );
}

function getFilenameFromDisposition(
  disposition: string | null,
  format: TransactionExportFormat,
): string {
  const fallback = `pocket-ledger-transactions.${format}`;
  if (!disposition) {
    return fallback;
  }

  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1]?.trim();
  if (!filename || filename.includes("/") || filename.includes("\\")) {
    return fallback;
  }
  return filename;
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
