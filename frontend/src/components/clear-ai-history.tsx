"use client";

import { useEffect, useRef, useState } from "react";

import {
  clearAiHistory,
  DataManagementApiError,
  type ClearAiHistoryResponse,
} from "@/lib/data-management";
import { Button, panelClassName } from "@/components/ui";

export function ClearAiHistory() {
  const abortRef = useRef<AbortController | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<ClearAiHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function handleConfirm() {
    if (isClearing) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsClearing(true);
    setError(null);

    try {
      const clearResult = await clearAiHistory(controller.signal);
      setResult(clearResult);
      setIsConfirming(false);
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }
      if (caughtError instanceof DataManagementApiError) {
        setError("Không xóa được lịch sử AI. Hãy thử lại.");
      } else {
        setError("Không xóa được lịch sử AI. Hãy thử lại.");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsClearing(false);
    }
  }

  return (
    <section className={panelClassName}>
      <div>
        <h2 className="text-lg font-semibold text-ledger-ink">
          Lịch sử AI
        </h2>
        <p className="mt-1 text-sm text-ledger-muted">
          Xóa bản nháp và lịch sử phân tích AI đang lưu trên máy. Giao dịch đã
          xác nhận và số dư vẫn được giữ nguyên.
        </p>
      </div>

      {result ? (
        <p className="mt-4 text-sm font-medium text-ledger-accent" role="status">
          Đã xóa {result.deleted_draft_count} bản ghi lịch sử AI. Đã giữ nguyên{" "}
          {result.preserved_transaction_count} giao dịch đã xác nhận.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm font-medium text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {isConfirming ? (
        <div
          aria-labelledby="clear-ai-history-title"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4"
          role="group"
        >
          <h3
            className="text-sm font-semibold text-ledger-ink"
            id="clear-ai-history-title"
          >
            Xác nhận xóa lịch sử AI
          </h3>
          <p className="mt-2 text-sm text-ledger-muted">
            Thao tác này chỉ xóa bản nháp và lịch sử AI đang lưu trên máy. Nó
            không xóa lịch sử giao dịch, file đã tải xuống, log ứng dụng, cấu
            hình Ollama hay model Ollama.
          </p>
          {isClearing ? (
            <p className="mt-3 text-sm text-ledger-muted" role="status">
              Đang xóa lịch sử AI...
            </p>
          ) : null}
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              disabled={isClearing}
              onClick={() => setIsConfirming(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <Button
              disabled={isClearing}
              onClick={() => void handleConfirm()}
              type="button"
              variant="danger"
            >
              {isClearing ? "Đang xóa" : "Xóa lịch sử AI"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="mt-4"
          disabled={isClearing}
          onClick={() => {
            setError(null);
            setIsConfirming(true);
          }}
          type="button"
          variant="danger"
        >
          Xóa lịch sử AI
        </Button>
      )}
    </section>
  );
}
