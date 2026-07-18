"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { AiDraftReview } from "@/components/ai-draft-review";
import { InsightResult } from "@/components/insight-result";
import {
  AiApiError,
  confirmAiDraft,
  parseAiMessage,
  queryBudgetRemainingInsight,
  querySpendingBreakdownInsight,
  querySpendingInsight,
  type AiInsightResponse,
  type AiParseResponse,
  type SupportedChatIntent,
} from "@/lib/ai";
import {
  CHAT_QUICK_ACTIONS,
  formatIntentLabel,
  routeChatIntent,
} from "@/lib/insight-router";
import type { RoutedChatIntent } from "@/lib/insight-router";
import { formatVnd } from "@/lib/money";

type ChatToLedgerProps = {
  onTransactionConfirmed: () => void;
  refreshSignal?: number;
};

type ChatEntry =
  | {
      id: number;
      intent: "create_transaction";
      isStale: boolean;
      message: string;
      parseResult: AiParseResponse;
    }
  | {
      id: number;
      insight: AiInsightResponse;
      intent: Exclude<RoutedChatIntent, "create_transaction" | "unknown">;
      isStale: boolean;
      message: string;
    }
  | {
      id: number;
      intent: "unknown";
      isStale: false;
      message: string;
    };

const MAX_CHAT_ENTRIES = 12;
const DEFAULT_INSIGHT_TIMEZONE = "Asia/Ho_Chi_Minh";

export function ChatToLedger({
  onTransactionConfirmed,
  refreshSignal = 0,
}: ChatToLedgerProps) {
  const [message, setMessage] = useState("");
  const [selectedIntent, setSelectedIntent] =
    useState<SupportedChatIntent>("auto");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [activeParseResult, setActiveParseResult] =
    useState<AiParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const lastSubmissionRef = useRef<{
    intent: SupportedChatIntent;
    message: string;
  } | null>(null);
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousRefreshSignalRef = useRef(refreshSignal);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (previousRefreshSignalRef.current === refreshSignal) {
      return;
    }
    previousRefreshSignalRef.current = refreshSignal;
    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.intent === "query_spending" ||
        entry.intent === "budget_remaining" ||
        entry.intent === "spending_breakdown"
          ? { ...entry, isStale: true }
          : entry,
      ),
    );
  }, [refreshSignal]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(message, selectedIntent);
  }

  async function submitMessage(
    submittedMessage: string,
    intentSelection: SupportedChatIntent,
  ) {
    const trimmedMessage = submittedMessage.trim();

    if (trimmedMessage.length === 0) {
      setError("Enter a message before sending.");
      setSuccess(null);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    const routedIntent = routeChatIntent(trimmedMessage, intentSelection);
    lastSubmissionRef.current = {
      intent: intentSelection,
      message: trimmedMessage,
    };
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    setPendingMessage(trimmedMessage);

    if (routedIntent === "unknown") {
      appendEntry({
        id: Date.now(),
        intent: "unknown",
        isStale: false,
        message: trimmedMessage,
      });
      setActiveParseResult(null);
      setIsSubmitting(false);
      setPendingMessage(null);
      return;
    }

    try {
      if (routedIntent === "create_transaction") {
        const result = await parseAiMessage(trimmedMessage, controller.signal);
        if (requestSequenceRef.current !== requestSequence) {
          return;
        }
        setActiveParseResult(result);
        appendEntry({
          id: Date.now(),
          intent: "create_transaction",
          isStale: false,
          message: trimmedMessage,
          parseResult: result,
        });
        return;
      }

      const insight = await runInsightQuery(
        routedIntent,
        trimmedMessage,
        controller.signal,
      );
      if (requestSequenceRef.current !== requestSequence) {
        return;
      }
      setActiveParseResult(null);
      appendEntry({
        id: Date.now(),
        insight,
        intent: routedIntent,
        isStale: false,
        message: trimmedMessage,
      });
    } catch (caughtError) {
      if (isAbortError(caughtError)) {
        return;
      }
      if (requestSequenceRef.current !== requestSequence) {
        return;
      }
      setError(
        getSafeErrorMessage(caughtError, "Unable to complete chat request."),
      );
    } finally {
      if (requestSequenceRef.current === requestSequence) {
        setIsSubmitting(false);
        setPendingMessage(null);
      }
    }
  }

  async function handleConfirm() {
    if (!activeParseResult?.draft_id) {
      setError("Parse the message again before confirming.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsConfirming(true);

    try {
      const result = await confirmAiDraft(activeParseResult.draft_id);
      const transaction = result.transaction;
      const amountPrefix = transaction.type === "expense" ? "-" : "+";
      setSuccess(
        `Transaction created: ${amountPrefix}${formatVnd(
          transaction.amount_minor,
        )} for ${transaction.category_slug}.`,
      );
      setMessage("");
      setActiveParseResult(null);
      onTransactionConfirmed();
    } catch (caughtError) {
      setError(getSafeErrorMessage(caughtError, "Unable to confirm draft."));
    } finally {
      setIsConfirming(false);
    }
  }

  function handleCancel() {
    setActiveParseResult(null);
    setError(null);
  }

  function handleQuickAction(intent: SupportedChatIntent, example: string) {
    setSelectedIntent(intent);
    setMessage(example);
    setError(null);
  }

  function handleRetry() {
    if (lastSubmissionRef.current === null) {
      return;
    }
    void submitMessage(
      lastSubmissionRef.current.message,
      lastSubmissionRef.current.intent,
    );
  }

  function appendEntry(entry: ChatEntry) {
    setEntries((currentEntries) =>
      [entry, ...currentEntries].slice(0, MAX_CHAT_ENTRIES),
    );
  }

  const hasConfirmableDraft = Boolean(
    activeParseResult?.draft_id && activeParseResult.draft,
  );
  const isDuplicatePendingSubmit =
    isSubmitting && pendingMessage === message.trim();

  return (
    <section className="rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-ledger-ink">
            Chat to ledger
          </legend>
          <div className="flex flex-wrap gap-2">
            {CHAT_QUICK_ACTIONS.map((action) => (
              <button
                className="rounded-md border border-ledger-line bg-white px-3 py-2 text-xs font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent"
                key={action.intent}
                onClick={() => handleQuickAction(action.intent, action.example)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ledger-ink">
            Message
          </span>
          <textarea
            aria-label="Chat to ledger message"
            className="min-h-24 resize-y rounded-md border-ledger-line bg-ledger-wash text-ledger-ink placeholder:text-ledger-muted focus:border-ledger-accent focus:ring-ledger-accent"
            disabled={isConfirming}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Hôm nay tôi tiêu 35k vào ăn trưa"
            value={message}
          />
        </label>

        <label className="grid gap-2 sm:max-w-xs">
          <span className="text-sm font-medium text-ledger-ink">
            Intent route
          </span>
          <select
            className="h-11 rounded-md border-ledger-line bg-white text-sm text-ledger-ink focus:border-ledger-accent focus:ring-ledger-accent"
            disabled={isConfirming}
            onChange={(event) =>
              setSelectedIntent(event.target.value as SupportedChatIntent)
            }
            value={selectedIntent}
          >
            <option value="auto">Auto route</option>
            <option value="create_transaction">Create transaction</option>
            <option value="query_spending">Query spending</option>
            <option value="budget_remaining">Budget remaining</option>
            <option value="spending_breakdown">Spending breakdown</option>
          </select>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="h-11 rounded-md bg-ledger-accent px-5 text-sm font-semibold text-white transition hover:bg-ledger-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConfirming || isDuplicatePendingSubmit}
            type="submit"
          >
            {isDuplicatePendingSubmit ? "Sending" : "Send"}
          </button>
          <p className="text-xs leading-5 text-ledger-muted">
            Transaction drafts require confirmation. Insights show backend-computed totals only.
          </p>
        </div>
      </form>

      <div className="mt-4 grid gap-3" aria-live="polite">
        {isSubmitting ? (
          <Message tone="info" text="Asking the local backend..." />
        ) : null}
        {error ? (
          <div className="grid gap-2" role="alert">
            <Message tone="error" text={error} />
            {lastSubmissionRef.current ? (
              <button
                className="w-fit rounded-md border border-ledger-line bg-white px-3 py-2 text-xs font-semibold text-ledger-ink transition hover:border-ledger-accent hover:text-ledger-accent"
                disabled={isSubmitting || isConfirming}
                onClick={handleRetry}
                type="button"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        {success ? <Message tone="success" text={success} /> : null}
        {activeParseResult?.clarification ? (
          <Clarification result={activeParseResult} />
        ) : null}
        {activeParseResult &&
        activeParseResult.intent === "unknown" &&
        !activeParseResult.clarification ? (
          <Message
            tone="info"
            text="I could not identify a supported ledger action. Edit the message and try again."
          />
        ) : null}
        {hasConfirmableDraft && activeParseResult?.draft ? (
          <AiDraftReview
            confidence={activeParseResult.confidence}
            draft={activeParseResult.draft}
            isConfirming={isConfirming}
            onCancel={handleCancel}
            onConfirm={() => void handleConfirm()}
          />
        ) : null}

        {entries.length > 0 ? (
          <div className="grid gap-3" aria-label="Session chat results">
            {entries.map((entry) => (
              <ChatEntryView entry={entry} key={entry.id} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

async function runInsightQuery(
  intent: Exclude<RoutedChatIntent, "create_transaction" | "unknown">,
  message: string,
  signal: AbortSignal,
): Promise<AiInsightResponse> {
  const request = {
    currency: "VND",
    locale: "vi-VN",
    message,
    timezone: DEFAULT_INSIGHT_TIMEZONE,
  };

  if (intent === "query_spending") {
    return {
      kind: "query_spending",
      result: await querySpendingInsight(request, signal),
    };
  }
  if (intent === "budget_remaining") {
    return {
      kind: "budget_remaining",
      result: await queryBudgetRemainingInsight(request, signal),
    };
  }

  return {
    kind: "spending_breakdown",
    result: await querySpendingBreakdownInsight(request, signal),
  };
}

function ChatEntryView({ entry }: { entry: ChatEntry }) {
  return (
    <article className="grid gap-2 rounded-md border border-ledger-line bg-ledger-wash p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ledger-ink">
          {formatIntentLabel(entry.intent)}
        </p>
        <p className="text-xs text-ledger-muted">{entry.message}</p>
      </div>
      {entry.intent === "unknown" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">
            I can help with transaction drafts and supported insight questions.
          </p>
          <p className="mt-1 text-xs">
            Try: Hôm nay tôi tiêu 35k vào ăn trưa; Tháng này tôi ăn uống hết bao nhiêu?; Còn bao nhiêu tiền ăn tháng này?; Tuần này tôi tiêu nhiều nhất vào mục nào?
          </p>
        </div>
      ) : null}
      {entry.intent === "create_transaction" &&
      entry.parseResult.clarification ? (
        <Clarification result={entry.parseResult} />
      ) : null}
      {entry.intent !== "create_transaction" && entry.intent !== "unknown" ? (
        <EntryInsightResult entry={entry} />
      ) : null}
    </article>
  );
}

function EntryInsightResult({
  entry,
}: {
  entry: Extract<ChatEntry, { insight: AiInsightResponse }>;
}) {
  if (entry.insight.kind === "query_spending") {
    return (
      <InsightResult
        isStale={entry.isStale}
        result={entry.insight.result}
        type="query_spending"
      />
    );
  }

  if (entry.insight.kind === "budget_remaining") {
    return (
      <InsightResult
        isStale={entry.isStale}
        result={entry.insight.result}
        type="budget_remaining"
      />
    );
  }

  return (
    <InsightResult
      isStale={entry.isStale}
      result={entry.insight.result}
      type="spending_breakdown"
    />
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

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.code === DOMException.ABORT_ERR)
  );
}
