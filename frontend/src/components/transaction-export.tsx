"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/categories";
import {
  buildTransactionExportUrl,
  DataManagementApiError,
  readDataManagementError,
  type TransactionExportFormat,
} from "@/lib/data-management";
import { Button, inputClassName, selectClassName } from "@/components/ui";
import type { TransactionType } from "@/lib/transactions";

type TransactionExportProps = {
  compact?: boolean;
  month: string;
};

export function TransactionExport({ compact = false, month }: TransactionExportProps) {
  const abortRef = useRef<AbortController | null>(null);
  const [format, setFormat] = useState<TransactionExportFormat>("csv");
  const [exportMonth, setExportMonth] = useState(month);
  const [category, setCategory] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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
            "Không tải được file xuất giao dịch.",
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
      setSuccess(`Đã bắt đầu tải file ${format.toUpperCase()}.`);
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }
      if (caughtError instanceof DataManagementApiError) {
        setError(getExportErrorMessage(caughtError));
      } else {
        setError("Không tải được file xuất giao dịch.");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsDownloading(false);
    }
  }

  const content = (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ledger-ink">
            Xuất dữ liệu
          </h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Tải CSV hoặc JSON từ dữ liệu đang lưu.
          </p>
        </div>
        <Button
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
          variant="outline"
        >
          {isOpen ? "Ẩn tùy chọn" : "Xuất dữ liệu"}
        </Button>
      </div>

      {isOpen ? (
      <form className="mt-4 grid gap-4 border-t border-ledger-line pt-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Định dạng
            <select
              className={selectClassName}
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
            Tháng
            <input
              className={inputClassName}
              onChange={(event) => setExportMonth(event.target.value)}
              type="month"
              value={exportMonth}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Danh mục
            <select
              className={selectClassName}
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="">Tất cả danh mục</option>
              {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-ledger-ink">
            Loại
            <select
              className={selectClassName}
              onChange={(event) => setType(event.target.value as TransactionType | "")}
              value={type}
            >
              <option value="">Tất cả</option>
              <option value="expense">Chi</option>
              <option value="income">Thu</option>
            </select>
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium text-ledger-ink">
          Tìm kiếm
          <input
            className={inputClassName}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ghi chú hoặc nơi giao dịch"
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

        <Button
          className="w-full sm:w-fit"
          disabled={isDownloading}
          type="submit"
        >
          {isDownloading ? "Đang chuẩn bị" : "Tải xuống"}
        </Button>
      </form>
      ) : null}
    </>
  );

  if (compact) {
    return (
      <div className="min-w-0">
        <Button
          aria-expanded={isOpen}
          className="w-full sm:w-auto"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
          variant="outline"
        >
          Xuất dữ liệu
        </Button>

        {isOpen ? (
          <form className="mt-4 grid gap-4 border-t border-ledger-line pt-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-ledger-ink">
                Định dạng
                <select
                  className={selectClassName}
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
                Tháng
                <input
                  className={inputClassName}
                  onChange={(event) => setExportMonth(event.target.value)}
                  type="month"
                  value={exportMonth}
                />
              </label>
            </div>

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

            <Button
              className="w-full sm:w-fit"
              disabled={isDownloading}
              type="submit"
            >
              {isDownloading ? "Đang chuẩn bị" : "Tải xuống"}
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-ledger-line bg-white p-4 shadow-soft">
      {content}
    </section>
  );
}

function getExportErrorMessage(error: DataManagementApiError): string {
  if (error.status === 413) {
    return "File xuất quá lớn. Hãy thu hẹp bộ lọc rồi thử lại.";
  }
  if (error.status === 422) {
    return "Bộ lọc xuất dữ liệu chưa hợp lệ.";
  }
  return error.message || "Không tải được file xuất giao dịch.";
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
