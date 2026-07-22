"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { AiDraftReview } from "@/components/ai-draft-review";
import { InsightResult } from "@/components/insight-result";
import { Button, panelClassName, textareaClassName } from "@/components/ui";
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
  routeChatIntent,
} from "@/lib/insight-router";
import type { RoutedChatIntent } from "@/lib/insight-router";
import { formatCategoryLabel } from "@/lib/categories";
import { formatVnd } from "@/lib/money";

type ChatToLedgerProps = {
  layout?: "compact" | "workspace";
  onConversationStateChange?: (hasConversation: boolean) => void;
  onTransactionConfirmed: () => void;
  refreshSignal?: number;
};

type ChatEntry =
  | {
      id: number;
      intent: "pending";
      isStale: false;
      message: string;
    }
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
    }
  | {
      error: string;
      id: number;
      intent: "error";
      isStale: false;
      message: string;
    };

const MAX_CHAT_ENTRIES = 12;
const DEFAULT_INSIGHT_TIMEZONE = "Asia/Ho_Chi_Minh";

export function ChatToLedger({
  layout = "compact",
  onConversationStateChange,
  onTransactionConfirmed,
  refreshSignal = 0,
}: ChatToLedgerProps) {
  const [message, setMessage] = useState("");
  const [selectedIntent, setSelectedIntent] =
    useState<SupportedChatIntent>("auto");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [activeDraftEntryId, setActiveDraftEntryId] = useState<number | null>(null);
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  useEffect(() => {
    onConversationStateChange?.(
      entries.length > 0 || Boolean(error) || Boolean(success),
    );
  }, [entries.length, error, onConversationStateChange, success]);

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
      setError("Nhập nội dung trước khi gửi.");
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
    setMessage("");
    window.requestAnimationFrame(() => textareaRef.current?.focus());

    if (routedIntent === "unknown") {
      appendEntry({
        id: Date.now(),
        intent: "unknown",
        isStale: false,
        message: trimmedMessage,
      });
      setIsSubmitting(false);
      setPendingMessage(null);
      return;
    }

    const entryId = Date.now();
    appendEntry({
      id: entryId,
      intent: "pending",
      isStale: false,
      message: trimmedMessage,
    });

    try {
      if (routedIntent === "create_transaction") {
        const result = await parseAiMessage(trimmedMessage, controller.signal);
        if (requestSequenceRef.current !== requestSequence) {
          return;
        }
        if (result.draft_id && result.draft) {
          setActiveDraftEntryId(entryId);
        }
        updateEntry(entryId, {
          id: entryId,
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
      setActiveDraftEntryId(null);
      updateEntry(entryId, {
        id: entryId,
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
      updateEntry(entryId, {
        error: getSafeErrorMessage(caughtError, "Chưa xử lý được yêu cầu này."),
        id: entryId,
        intent: "error",
        isStale: false,
        message: trimmedMessage,
      });
    } finally {
      if (requestSequenceRef.current === requestSequence) {
        setIsSubmitting(false);
        setPendingMessage(null);
      }
    }
  }

  async function handleConfirm() {
    const activeDraftEntry = entries.find(
      (entry): entry is Extract<ChatEntry, { intent: "create_transaction" }> =>
        entry.intent === "create_transaction" && entry.id === activeDraftEntryId,
    );

    if (!activeDraftEntry?.parseResult.draft_id) {
      setError("Vui lòng gửi lại tin nhắn trước khi xác nhận.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsConfirming(true);

    try {
      const result = await confirmAiDraft(activeDraftEntry.parseResult.draft_id);
      const transaction = result.transaction;
      const amountPrefix = transaction.type === "expense" ? "−" : "+";
      setSuccess(
        `Đã tạo giao dịch: ${amountPrefix}${formatVnd(
          transaction.amount_minor,
        )} cho ${formatCategoryLabel(transaction.category_slug)}.`,
      );
      setMessage("");
      setActiveDraftEntryId(null);
      onTransactionConfirmed();
    } catch (caughtError) {
      setError(getSafeErrorMessage(caughtError, "Không xác nhận được bản nháp."));
    } finally {
      setIsConfirming(false);
    }
  }

  function handleCancel() {
    setActiveDraftEntryId(null);
    setError(null);
  }

  function handleQuickAction(intent: SupportedChatIntent, example: string) {
    setSelectedIntent(intent);
    setMessage(example);
    setError(null);
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || isSubmitting || isConfirming) {
      return;
    }

    event.preventDefault();
    void submitMessage(message, selectedIntent);
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
      [...currentEntries, entry].slice(-MAX_CHAT_ENTRIES),
    );
  }

  function updateEntry(entryId: number, nextEntry: ChatEntry) {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => (entry.id === entryId ? nextEntry : entry)),
    );
  }

  function handleClarificationAction(label: string) {
    setMessage(label);
    textareaRef.current?.focus();
  }

  const isDuplicatePendingSubmit =
    isSubmitting && pendingMessage === message.trim();
  const isBlockedPendingSubmit =
    isSubmitting && (message.trim().length === 0 || isDuplicatePendingSubmit);
  const containerClassName =
    layout === "workspace"
      ? "flex min-h-0 flex-1 flex-col"
      : panelClassName;
  const messageListClassName =
    layout === "workspace"
      ? "min-h-0 flex-1 overflow-y-auto py-2 pr-1 sm:py-5"
      : "mt-4 grid gap-3";
  const composerClassName =
    layout === "workspace"
      ? "border-t border-ledger-line bg-ledger-wash pt-3 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pt-4 sm:pb-4"
      : "grid gap-4";
  const composerTextareaClassName =
    layout === "workspace"
      ? `${textareaClassName} min-h-20 sm:min-h-24`
      : textareaClassName;
  const isEmptyConversation = entries.length === 0 && !error && !success;

  return (
    <section className={containerClassName}>
      <div
        className={messageListClassName}
        aria-label="Cuộc trò chuyện với trợ lý"
        aria-live="polite"
        role="log"
        tabIndex={0}
      >
        {isEmptyConversation ? (
          <div className="mx-auto grid max-w-2xl gap-4 py-5 text-center sm:py-8">
            <p className="text-2xl font-semibold text-ledger-ink">
              Bạn muốn ghi giao dịch hay hỏi số liệu?
            </p>
            <p className="text-sm leading-6 text-ledger-muted sm:text-base">
              Trợ lý tạo bản nháp để bạn kiểm tra trước khi lưu. Các câu hỏi
              chi tiêu chỉ đọc dữ liệu đang có.
            </p>
            <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
              {CHAT_QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.intent}
                  className="min-w-0 whitespace-normal text-center leading-tight sm:whitespace-nowrap"
                  onClick={() => handleQuickAction(action.intent, action.example)}
                  size="small"
                  type="button"
                  variant="outline"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <Message tone="error" text={error} /> : null}
        {success ? <Message tone="success" text={success} /> : null}

        {entries.length > 0 ? (
          <div className="grid gap-3" aria-label="Kết quả trong phiên này">
            {entries.map((entry) => (
              <ChatEntryView
                activeDraftEntryId={activeDraftEntryId}
                entry={entry}
                isConfirming={isConfirming}
                isSubmitting={isSubmitting}
                key={entry.id}
                onCancelDraft={handleCancel}
                onClarificationAction={handleClarificationAction}
                onConfirmDraft={() => void handleConfirm()}
                onRetry={handleRetry}
              />
            ))}
          </div>
        ) : null}
      </div>

      <form className={composerClassName} onSubmit={handleSubmit}>
        <div className="grid gap-3 rounded-lg border border-ledger-line bg-white p-3 shadow-soft lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="sr-only">
              Tin nhắn
            </span>
            <textarea
              aria-label="Chat to ledger message"
              className={composerTextareaClassName}
              disabled={isConfirming}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Hôm nay tôi tiêu 35k vào ăn trưa"
              ref={textareaRef}
              value={message}
            />
          </label>
          <Button
            className="w-full lg:w-auto"
            disabled={isConfirming || isBlockedPendingSubmit}
            size="large"
            type="submit"
          >
            {isBlockedPendingSubmit ? "Đang gửi" : "Gửi"}
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-ledger-muted">
            Enter để gửi, Shift+Enter để xuống dòng. Giao dịch cần bạn xác nhận
            trước khi ghi vào sổ.
          </p>
        </div>
      </form>
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

function ChatEntryView({
  activeDraftEntryId,
  entry,
  isConfirming,
  isSubmitting,
  onCancelDraft,
  onClarificationAction,
  onConfirmDraft,
  onRetry,
}: {
  activeDraftEntryId: number | null;
  entry: ChatEntry;
  isConfirming: boolean;
  isSubmitting: boolean;
  onCancelDraft: () => void;
  onClarificationAction: (label: string) => void;
  onConfirmDraft: () => void;
  onRetry: () => void;
}) {
  return (
    <article className="grid gap-3">
      <div className="max-w-[90%] justify-self-end rounded-2xl rounded-br-sm bg-ledger-accent px-4 py-2 text-sm text-white">
        {entry.message}
      </div>
      {entry.intent === "pending" ? (
        <Message tone="info" text="Đang hỏi trợ lý cục bộ..." />
      ) : null}
      {entry.intent === "error" ? (
        <ProviderUnavailable
          disabled={isSubmitting || isConfirming}
          message={entry.error}
          onRetry={onRetry}
        />
      ) : null}
      {entry.intent === "unknown" ? (
        <Clarification
          message="Mình chưa chắc đây có phải một giao dịch không. Bạn có thể nói rõ khoản thu hoặc chi không?"
          title="Cần thêm thông tin"
        />
      ) : null}
      {entry.intent === "create_transaction" &&
      entry.parseResult.clarification ? (
        <Clarification
          fields={entry.parseResult.clarification.fields}
          message={
            entry.parseResult.clarification.message ??
            "Bản nháp này cần thêm thông tin trước khi xác nhận."
          }
          onAction={onClarificationAction}
          title="Cần thêm thông tin"
        />
      ) : null}
      {entry.intent === "create_transaction" &&
      entry.parseResult.intent === "unknown" &&
      !entry.parseResult.clarification ? (
        <Clarification
          message="Mình chưa chắc đây có phải một giao dịch không. Bạn có thể nói rõ khoản thu hoặc chi không?"
          title="Cần thêm thông tin"
        />
      ) : null}
      {entry.intent === "create_transaction" &&
      entry.id === activeDraftEntryId &&
      entry.parseResult.draft ? (
        <AiDraftReview
          confidence={entry.parseResult.confidence}
          draft={entry.parseResult.draft}
          isConfirming={isConfirming}
          onCancel={onCancelDraft}
          onConfirm={onConfirmDraft}
        />
      ) : null}
      {entry.intent === "query_spending" ||
      entry.intent === "budget_remaining" ||
      entry.intent === "spending_breakdown" ? (
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

function Clarification({
  fields = [],
  message,
  onAction,
  title,
}: {
  fields?: string[];
  message: string;
  onAction?: (label: string) => void;
  title: string;
}) {
  const friendlyFields = fields.map(formatClarificationField).filter(Boolean);
  const showCategoryActions = friendlyFields.includes("nhóm chi tiêu");

  return (
    <div className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
      {friendlyFields.length > 0 ? (
        <p className="mt-2 text-xs text-amber-800">
          Thông tin cần rõ hơn: {friendlyFields.join(", ")}
        </p>
      ) : null}
      {showCategoryActions && onAction ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {["Ăn uống", "Cà phê", "Đi lại"].map((label) => (
            <Button
              key={label}
              onClick={() => onAction(label)}
              size="small"
              type="button"
              variant="outline"
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProviderUnavailable({
  disabled,
  message,
  onRetry,
}: {
  disabled: boolean;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="max-w-2xl rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-rose-950"
      role="alert"
    >
      <p className="text-base font-semibold">Trợ lý chưa sẵn sàng</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button disabled={disabled} onClick={onRetry} type="button" variant="primary">
          Thử lại
        </Button>
        <a
          className="inline-flex h-10 items-center justify-center rounded-md border border-ledger-line bg-white px-4 text-sm font-semibold text-ledger-ink transition-colors hover:bg-ledger-wash focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-accent"
          href="/settings"
        >
          Mở Cài đặt
        </a>
      </div>
    </div>
  );
}

function formatClarificationField(field: string): string {
  switch (field) {
    case "amount_minor":
      return "số tiền";
    case "category_slug":
      return "nhóm chi tiêu";
    case "transaction_type":
      return "khoản thu hay khoản chi";
    case "currency":
      return "đơn vị tiền";
    case "description":
      return "ghi chú";
    case "occurred_at_iso":
      return "ngày giao dịch";
    case "intent":
    case "missing_fields":
      return "";
    default:
      return "";
  }
}

function getSafeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AiApiError) {
    if (error.status === 503) {
      return "Trợ lý AI chưa sẵn sàng. Hãy kiểm tra Ollama trong phần Cài đặt.";
    }
    if (error.status === 504) {
      return "Trợ lý AI phản hồi quá lâu. Hãy thử lại sau hoặc kiểm tra Ollama.";
    }
    if (error.status === 502) {
      return "Trợ lý AI trả về dữ liệu chưa đọc được. Hãy thử lại.";
    }
    if (error.message.toLowerCase().includes("local ai")) {
      return "Trợ lý AI chưa sẵn sàng. Hãy kiểm tra Ollama trong phần Cài đặt.";
    }
    if (error.message.toLowerCase().includes("provider")) {
      return "Trợ lý AI đang gặp lỗi. Hãy thử lại hoặc kiểm tra Ollama trong phần Cài đặt.";
    }
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
