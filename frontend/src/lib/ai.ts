import type { TransactionListItem } from "@/lib/transactions";

export type AiConfidence = "high" | "medium" | "low" | string;

export type AiIntent =
  | "create_transaction"
  | "query_spending"
  | "budget_remaining"
  | "spending_breakdown"
  | "unknown"
  | string;

export type SupportedChatIntent =
  | "auto"
  | "create_transaction"
  | "query_spending"
  | "budget_remaining"
  | "spending_breakdown";

export type AiTransactionDraft = {
  type: "expense" | "income";
  amount_minor: number;
  currency: string;
  category_slug: string;
  description: string;
  merchant: string | null;
  occurred_at: string | null;
  source: "ai_chat";
};

export type AiClarification = {
  message: string;
  fields: string[];
};

export type AiParseResponse = {
  intent: AiIntent;
  draft_id: string | null;
  draft: AiTransactionDraft | null;
  needs_confirmation: boolean;
  confidence: AiConfidence;
  missing_fields: string[];
  clarification: AiClarification | null;
};

export type AiConfirmResponse = {
  transaction: TransactionListItem;
  account_balance_minor: number;
};

export type AiInsightDateRange = {
  start: string;
  end: string;
  label: string;
};

export type AiQueryRequest = {
  message: string;
  locale?: string;
  currency?: string;
  timezone?: string;
};

export type AiQuerySpendingResponse = {
  intent: "query_spending" | string;
  category_slug: string | null;
  currency: string;
  date_range: AiInsightDateRange | null;
  amount_minor: number | null;
  transaction_count: number;
  answer: string | null;
  needs_clarification: boolean;
  clarification: AiClarification | null;
};

export type AiQueryBudgetRemainingResponse = {
  intent: "budget_remaining" | string;
  category_slug: string | null;
  currency: string;
  date_range: AiInsightDateRange | null;
  budget_minor: number | null;
  spent_minor: number | null;
  remaining_minor: number | null;
  is_over_budget: boolean | null;
  transaction_count: number;
  answer: string | null;
  needs_clarification: boolean;
  clarification: AiClarification | null;
};

export type AiSpendingBreakdownEntry = {
  category_slug: string;
  amount_minor: number;
  transaction_count: number;
  percentage: number;
};

export type AiQuerySpendingBreakdownResponse = {
  intent: "spending_breakdown" | string;
  currency: string;
  date_range: AiInsightDateRange | null;
  total_expense_minor: number | null;
  transaction_count: number;
  top_category: AiSpendingBreakdownEntry | null;
  breakdown: AiSpendingBreakdownEntry[];
  answer: string | null;
  needs_clarification: boolean;
  clarification: AiClarification | null;
};

export type AiInsightResponse =
  | {
      kind: "query_spending";
      result: AiQuerySpendingResponse;
    }
  | {
      kind: "budget_remaining";
      result: AiQueryBudgetRemainingResponse;
    }
  | {
      kind: "spending_breakdown";
      result: AiQuerySpendingBreakdownResponse;
    };

export class AiApiError extends Error {
  constructor(message = "Unable to complete AI ledger action") {
    super(message);
    this.name = "AiApiError";
  }
}

export async function parseAiMessage(
  message: string,
  signal?: AbortSignal,
): Promise<AiParseResponse> {
  const response = await fetch("/api/ai/parse", {
    body: JSON.stringify({ message }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw new AiApiError(await readErrorMessage(response));
  }

  const payload: unknown = await response.json();
  return parseAiParseResponse(payload);
}

export async function confirmAiDraft(
  draftId: string,
  signal?: AbortSignal,
): Promise<AiConfirmResponse> {
  const response = await fetch("/api/ai/confirm", {
    body: JSON.stringify({ draft_id: draftId }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw new AiApiError(await readErrorMessage(response));
  }

  const payload: unknown = await response.json();
  return parseAiConfirmResponse(payload);
}

export async function querySpendingInsight(
  request: AiQueryRequest,
  signal?: AbortSignal,
): Promise<AiQuerySpendingResponse> {
  const payload = buildInsightRequestPayload(request);
  const response = await fetch("/api/ai/query-spending", {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw new AiApiError(await readErrorMessage(response));
  }

  return parseAiQuerySpendingResponse(await response.json());
}

export async function queryBudgetRemainingInsight(
  request: AiQueryRequest,
  signal?: AbortSignal,
): Promise<AiQueryBudgetRemainingResponse> {
  const payload = buildInsightRequestPayload(request);
  const response = await fetch("/api/ai/query-budget-remaining", {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw new AiApiError(await readErrorMessage(response));
  }

  return parseAiQueryBudgetRemainingResponse(await response.json());
}

export async function querySpendingBreakdownInsight(
  request: AiQueryRequest,
  signal?: AbortSignal,
): Promise<AiQuerySpendingBreakdownResponse> {
  const payload = buildInsightRequestPayload(request);
  const response = await fetch("/api/ai/query-spending-breakdown", {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw new AiApiError(await readErrorMessage(response));
  }

  return parseAiQuerySpendingBreakdownResponse(await response.json());
}

export function parseAiParseResponse(payload: unknown): AiParseResponse {
  if (!isRecord(payload)) {
    throw new AiApiError("Invalid AI parse response");
  }

  const {
    intent,
    draft_id: draftId,
    draft,
    needs_confirmation: needsConfirmation,
    confidence,
    missing_fields: missingFields,
    clarification,
  } = payload;

  if (
    typeof intent !== "string" ||
    !(typeof draftId === "string" || draftId === null) ||
    !(draft === null || isRecord(draft)) ||
    typeof needsConfirmation !== "boolean" ||
    typeof confidence !== "string" ||
    !Array.isArray(missingFields) ||
    !missingFields.every((field) => typeof field === "string") ||
    !(clarification === null || isRecord(clarification))
  ) {
    throw new AiApiError("Invalid AI parse response");
  }

  return {
    intent,
    draft_id: draftId,
    draft: draft === null ? null : parseAiTransactionDraft(draft),
    needs_confirmation: needsConfirmation,
    confidence,
    missing_fields: missingFields,
    clarification:
      clarification === null ? null : parseAiClarification(clarification),
  };
}

export function parseAiConfirmResponse(payload: unknown): AiConfirmResponse {
  if (!isRecord(payload)) {
    throw new AiApiError("Invalid AI confirmation response");
  }

  const {
    transaction,
    account_balance_minor: accountBalanceMinor,
  } = payload;

  if (
    !isRecord(transaction) ||
    typeof accountBalanceMinor !== "number" ||
    !Number.isInteger(accountBalanceMinor)
  ) {
    throw new AiApiError("Invalid AI confirmation response");
  }

  return {
    transaction: parseConfirmedTransaction(transaction),
    account_balance_minor: accountBalanceMinor,
  };
}

export function parseAiQuerySpendingResponse(
  payload: unknown,
): AiQuerySpendingResponse {
  if (!isRecord(payload)) {
    throw new AiApiError("Invalid spending query response");
  }

  const {
    intent,
    category_slug: categorySlug,
    currency,
    date_range: dateRange,
    amount_minor: amountMinor,
    transaction_count: transactionCount,
    answer,
    needs_clarification: needsClarification,
    clarification,
  } = payload;

  if (
    typeof intent !== "string" ||
    !(typeof categorySlug === "string" || categorySlug === null) ||
    typeof currency !== "string" ||
    !(dateRange === null || isRecord(dateRange)) ||
    !(Number.isInteger(amountMinor) || amountMinor === null) ||
    !Number.isInteger(transactionCount) ||
    !(typeof answer === "string" || answer === null) ||
    typeof needsClarification !== "boolean" ||
    !(clarification === null || isRecord(clarification))
  ) {
    throw new AiApiError("Invalid spending query response");
  }

  const parsedAmountMinor = amountMinor as number | null;
  const parsedTransactionCount = transactionCount as number;

  return {
    intent,
    category_slug: categorySlug,
    currency,
    date_range: dateRange === null ? null : parseAiDateRange(dateRange),
    amount_minor: parsedAmountMinor,
    transaction_count: parsedTransactionCount,
    answer,
    needs_clarification: needsClarification,
    clarification:
      clarification === null ? null : parseAiClarification(clarification),
  };
}

export function parseAiQueryBudgetRemainingResponse(
  payload: unknown,
): AiQueryBudgetRemainingResponse {
  if (!isRecord(payload)) {
    throw new AiApiError("Invalid budget remaining query response");
  }

  const {
    intent,
    category_slug: categorySlug,
    currency,
    date_range: dateRange,
    budget_minor: budgetMinor,
    spent_minor: spentMinor,
    remaining_minor: remainingMinor,
    is_over_budget: isOverBudget,
    transaction_count: transactionCount,
    answer,
    needs_clarification: needsClarification,
    clarification,
  } = payload;

  if (
    typeof intent !== "string" ||
    !(typeof categorySlug === "string" || categorySlug === null) ||
    typeof currency !== "string" ||
    !(dateRange === null || isRecord(dateRange)) ||
    !(Number.isInteger(budgetMinor) || budgetMinor === null) ||
    !(Number.isInteger(spentMinor) || spentMinor === null) ||
    !(Number.isInteger(remainingMinor) || remainingMinor === null) ||
    !(typeof isOverBudget === "boolean" || isOverBudget === null) ||
    !Number.isInteger(transactionCount) ||
    !(typeof answer === "string" || answer === null) ||
    typeof needsClarification !== "boolean" ||
    !(clarification === null || isRecord(clarification))
  ) {
    throw new AiApiError("Invalid budget remaining query response");
  }

  const parsedBudgetMinor = budgetMinor as number | null;
  const parsedSpentMinor = spentMinor as number | null;
  const parsedRemainingMinor = remainingMinor as number | null;
  const parsedTransactionCount = transactionCount as number;

  return {
    intent,
    category_slug: categorySlug,
    currency,
    date_range: dateRange === null ? null : parseAiDateRange(dateRange),
    budget_minor: parsedBudgetMinor,
    spent_minor: parsedSpentMinor,
    remaining_minor: parsedRemainingMinor,
    is_over_budget: isOverBudget,
    transaction_count: parsedTransactionCount,
    answer,
    needs_clarification: needsClarification,
    clarification:
      clarification === null ? null : parseAiClarification(clarification),
  };
}

export function parseAiQuerySpendingBreakdownResponse(
  payload: unknown,
): AiQuerySpendingBreakdownResponse {
  if (!isRecord(payload)) {
    throw new AiApiError("Invalid spending breakdown query response");
  }

  const {
    intent,
    currency,
    date_range: dateRange,
    total_expense_minor: totalExpenseMinor,
    transaction_count: transactionCount,
    top_category: topCategory,
    breakdown,
    answer,
    needs_clarification: needsClarification,
    clarification,
  } = payload;

  if (
    typeof intent !== "string" ||
    typeof currency !== "string" ||
    !(dateRange === null || isRecord(dateRange)) ||
    !(Number.isInteger(totalExpenseMinor) || totalExpenseMinor === null) ||
    !Number.isInteger(transactionCount) ||
    !(topCategory === null || isRecord(topCategory)) ||
    !Array.isArray(breakdown) ||
    !(typeof answer === "string" || answer === null) ||
    typeof needsClarification !== "boolean" ||
    !(clarification === null || isRecord(clarification))
  ) {
    throw new AiApiError("Invalid spending breakdown query response");
  }

  const parsedTotalExpenseMinor = totalExpenseMinor as number | null;
  const parsedTransactionCount = transactionCount as number;

  return {
    intent,
    currency,
    date_range: dateRange === null ? null : parseAiDateRange(dateRange),
    total_expense_minor: parsedTotalExpenseMinor,
    transaction_count: parsedTransactionCount,
    top_category:
      topCategory === null ? null : parseSpendingBreakdownEntry(topCategory),
    breakdown: breakdown.map(parseUnknownSpendingBreakdownEntry),
    answer,
    needs_clarification: needsClarification,
    clarification:
      clarification === null ? null : parseAiClarification(clarification),
  };
}

export function getAiErrorMessageForStatus(
  status: number,
  action: "parse" | "confirm" | "insight",
): string {
  if (status === 503) {
    return "Local AI is disabled or unavailable. Start Ollama or try again later.";
  }
  if (status === 504) {
    return "AI provider timed out. Try again with a shorter message.";
  }
  if (status === 404) {
    return "AI draft was not found. Parse the message again before confirming.";
  }
  if (status === 422) {
    if (action === "insight") {
      return "Insight request failed validation. Edit the message and try again.";
    }
    return action === "parse"
      ? "Message could not be parsed. Edit the text and try again."
      : "AI draft could not be confirmed. It may be expired, duplicate, or invalid.";
  }
  if (status === 502) {
    if (action === "insight") {
      return "AI provider returned an invalid insight response.";
    }
    return action === "parse"
      ? "AI provider returned an invalid parse response."
      : "AI confirmation failed safely.";
  }

  return action === "parse"
    ? "Unable to parse the message."
    : action === "confirm"
      ? "Unable to confirm the AI draft."
      : "Unable to answer the insight request.";
}

export function buildInsightRequestPayload(
  request: AiQueryRequest,
): Required<AiQueryRequest> {
  return {
    message: request.message,
    locale: request.locale ?? "vi-VN",
    currency: request.currency ?? "VND",
    timezone: getSupportedTimezone(request.timezone),
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    return "Unable to complete AI ledger action";
  }

  return "Unable to complete AI ledger action";
}

function parseAiTransactionDraft(
  payload: Record<string, unknown>,
): AiTransactionDraft {
  const {
    type,
    amount_minor: amountMinor,
    currency,
    category_slug: categorySlug,
    description,
    merchant,
    occurred_at: occurredAt,
    source,
  } = payload;

  if (
    !(type === "expense" || type === "income") ||
    typeof amountMinor !== "number" ||
    !Number.isInteger(amountMinor) ||
    typeof currency !== "string" ||
    typeof categorySlug !== "string" ||
    typeof description !== "string" ||
    !(typeof merchant === "string" || merchant === null) ||
    !(typeof occurredAt === "string" || occurredAt === null) ||
    source !== "ai_chat"
  ) {
    throw new AiApiError("Invalid AI transaction draft");
  }

  return {
    type,
    amount_minor: amountMinor,
    currency,
    category_slug: categorySlug,
    description,
    merchant,
    occurred_at: occurredAt,
    source,
  };
}

function parseAiClarification(
  payload: Record<string, unknown>,
): AiClarification {
  const { message, fields } = payload;

  if (
    typeof message !== "string" ||
    !Array.isArray(fields) ||
    !fields.every((field) => typeof field === "string")
  ) {
    throw new AiApiError("Invalid AI clarification response");
  }

  return {
    message,
    fields,
  };
}

function parseAiDateRange(
  payload: Record<string, unknown>,
): AiInsightDateRange {
  const { start, end, label } = payload;

  if (
    typeof start !== "string" ||
    typeof end !== "string" ||
    typeof label !== "string"
  ) {
    throw new AiApiError("Invalid AI insight date range");
  }

  return { start, end, label };
}

function parseUnknownSpendingBreakdownEntry(
  payload: unknown,
): AiSpendingBreakdownEntry {
  if (!isRecord(payload)) {
    throw new AiApiError("Invalid spending breakdown entry");
  }

  return parseSpendingBreakdownEntry(payload);
}

function parseSpendingBreakdownEntry(
  payload: Record<string, unknown>,
): AiSpendingBreakdownEntry {
  const {
    category_slug: categorySlug,
    amount_minor: amountMinor,
    transaction_count: transactionCount,
    percentage,
  } = payload;

  if (
    typeof categorySlug !== "string" ||
    !Number.isInteger(amountMinor) ||
    !Number.isInteger(transactionCount) ||
    typeof percentage !== "number" ||
    !Number.isFinite(percentage)
  ) {
    throw new AiApiError("Invalid spending breakdown entry");
  }

  const parsedAmountMinor = amountMinor as number;
  const parsedTransactionCount = transactionCount as number;

  return {
    category_slug: categorySlug,
    amount_minor: parsedAmountMinor,
    transaction_count: parsedTransactionCount,
    percentage,
  };
}

function getSupportedTimezone(timezone: string | undefined): string {
  if (!timezone) {
    return "Asia/Ho_Chi_Minh";
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return "Asia/Ho_Chi_Minh";
  }
}

function parseConfirmedTransaction(
  payload: Record<string, unknown>,
): TransactionListItem {
  const {
    id,
    type,
    amount_minor: amountMinor,
    currency,
    category_slug: categorySlug,
    description,
    merchant,
    occurred_at: occurredAt,
    source,
  } = payload;

  if (
    typeof id !== "string" ||
    !(type === "expense" || type === "income") ||
    typeof amountMinor !== "number" ||
    !Number.isInteger(amountMinor) ||
    typeof currency !== "string" ||
    typeof categorySlug !== "string" ||
    typeof description !== "string" ||
    !(typeof merchant === "string" || merchant === null) ||
    typeof occurredAt !== "string" ||
    typeof source !== "string"
  ) {
    throw new AiApiError("Invalid confirmed transaction");
  }

  return {
    id,
    type,
    amount_minor: amountMinor,
    currency,
    category_slug: categorySlug,
    description,
    merchant,
    occurred_at: occurredAt,
    source,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
