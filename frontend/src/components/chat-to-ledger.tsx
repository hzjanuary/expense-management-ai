"use client";

import { FormEvent, useState } from "react";

import { AiDraftReview } from "@/components/ai-draft-review";
import {
  AiApiError,
  confirmAiDraft,
  parseAiMessage,
  type AiParseResponse,
} from "@/lib/ai";
import { formatVnd } from "@/lib/money";

type ChatToLedgerProps = {
  onTransactionConfirmed: () => void;
};

export function ChatToLedger({ onTransactionConfirmed }: ChatToLedgerProps) {
  const [message, setMessage] = useState("");
  const [parseResult, setParseResult] = useState<AiParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0) {
      setError("Enter a message to parse.");
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsParsing(true);

    try {
      const result = await parseAiMessage(trimmedMessage);
      setParseResult(result);
    } catch (caughtError) {
      setParseResult(null);
      setError(getSafeErrorMessage(caughtError, "Unable to parse message."));
    } finally {
      setIsParsing(false);
    }
  }

  async function handleConfirm() {
    if (!parseResult?.draft_id) {
      setError("Parse the message again before confirming.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsConfirming(true);

    try {
      const result = await confirmAiDraft(parseResult.draft_id);
      const transaction = result.transaction;
      const amountPrefix = transaction.type === "expense" ? "-" : "+";
      setSuccess(
        `Transaction created: ${amountPrefix}${formatVnd(
          transaction.amount_minor,
        )} for ${transaction.category_slug}.`,
      );
      setMessage("");
      setParseResult(null);
      onTransactionConfirmed();
    } catch (caughtError) {
      setError(getSafeErrorMessage(caughtError, "Unable to confirm draft."));
    } finally {
      setIsConfirming(false);
    }
  }

  function handleCancel() {
    setParseResult(null);
    setError(null);
  }

  const hasConfirmableDraft = Boolean(parseResult?.draft_id && parseResult.draft);

  return (
    <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-ledger-ink">
            Chat to ledger
          </span>
          <textarea
            aria-label="Chat to ledger message"
            className="min-h-24 resize-y rounded-md border-ledger-line bg-ledger-wash text-ledger-ink placeholder:text-ledger-muted focus:border-ledger-accent focus:ring-ledger-accent"
            disabled={isParsing || isConfirming}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Hôm nay tôi tiêu 35k vào ăn trưa"
            value={message}
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="h-11 rounded-md bg-ledger-accent px-5 text-sm font-semibold text-white transition hover:bg-ledger-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isParsing || isConfirming}
            type="submit"
          >
            {isParsing ? "Parsing" : "Parse draft"}
          </button>
          <p className="text-xs leading-5 text-ledger-muted">
            AI can draft only. The ledger changes after explicit confirmation.
          </p>
        </div>
      </form>

      <div className="mt-4 grid gap-3" aria-live="polite">
        {error ? <Message tone="error" text={error} /> : null}
        {success ? <Message tone="success" text={success} /> : null}
        {parseResult?.clarification ? (
          <Clarification result={parseResult} />
        ) : null}
        {parseResult &&
        parseResult.intent === "unknown" &&
        !parseResult.clarification ? (
          <Message
            tone="info"
            text="I could not identify a supported ledger action. Edit the message and try again."
          />
        ) : null}
        {hasConfirmableDraft && parseResult?.draft ? (
          <AiDraftReview
            confidence={parseResult.confidence}
            draft={parseResult.draft}
            isConfirming={isConfirming}
            onCancel={handleCancel}
            onConfirm={() => void handleConfirm()}
          />
        ) : null}
      </div>
    </section>
  );
}

type MessageProps = {
  text: string;
  tone: "error" | "info" | "success";
};

function Message({ text, tone }: MessageProps) {
  const toneClassName =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-ledger-line bg-white text-ledger-ink";

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClassName}`}>
      {text}
    </div>
  );
}

function Clarification({ result }: { result: AiParseResponse }) {
  const fields = result.clarification?.fields ?? result.missing_fields;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-900">
        {result.clarification?.message ??
          "This draft needs clarification before it can be confirmed."}
      </p>
      {fields.length > 0 ? (
        <p className="mt-2 text-xs text-amber-800">
          Missing fields: {fields.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function getSafeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AiApiError) {
    return error.message;
  }

  return fallback;
}
