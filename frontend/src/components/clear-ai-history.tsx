"use client";

import { useEffect, useRef, useState } from "react";

import {
  clearAiHistory,
  DataManagementApiError,
  type ClearAiHistoryResponse,
} from "@/lib/data-management";

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
        setError(caughtError.message);
      } else {
        setError("Unable to clear AI history.");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsClearing(false);
    }
  }

  return (
    <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold text-ledger-ink">
          AI History Privacy
        </h2>
        <p className="mt-1 text-sm text-ledger-muted">
          Clears locally stored AI draft and parsing history. Confirmed
          transactions and account balances remain unchanged.
        </p>
      </div>

      {result ? (
        <p className="mt-4 text-sm font-medium text-ledger-accent" role="status">
          Cleared {result.deleted_draft_count} AI draft records. Preserved{" "}
          {result.preserved_transaction_count} referenced ledger transactions.
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
            Confirm AI history clear
          </h3>
          <p className="mt-2 text-sm text-ledger-muted">
            This removes AI draft/history rows stored locally. It does not clear
            transaction history, exported files, application logs, provider
            configuration, or Ollama models.
          </p>
          {isClearing ? (
            <p className="mt-3 text-sm text-ledger-muted" role="status">
              Clearing AI history...
            </p>
          ) : null}
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="h-10 rounded-md border border-ledger-line bg-white px-4 text-sm font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isClearing}
              onClick={() => setIsConfirming(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-md bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isClearing}
              onClick={() => void handleConfirm()}
              type="button"
            >
              {isClearing ? "Clearing" : "Clear AI history"}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="mt-4 h-10 rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isClearing}
          onClick={() => {
            setError(null);
            setIsConfirming(true);
          }}
          type="button"
        >
          Clear AI history
        </button>
      )}
    </section>
  );
}
