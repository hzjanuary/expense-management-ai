import type { TransactionListItem } from "@/lib/transactions";

export type AiConfidence = "high" | "medium" | "low" | string;

export type AiIntent =
  | "create_transaction"
  | "query_spending"
  | "set_budget"
  | "unknown"
  | string;

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

export class AiApiError extends Error {
  constructor(message = "Unable to complete AI ledger action") {
    super(message);
    this.name = "AiApiError";
  }
}

export async function parseAiMessage(message: string): Promise<AiParseResponse> {
  const response = await fetch("/api/ai/parse", {
    body: JSON.stringify({ message }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new AiApiError(await readErrorMessage(response));
  }

  const payload: unknown = await response.json();
  return parseAiParseResponse(payload);
}

export async function confirmAiDraft(
  draftId: string,
): Promise<AiConfirmResponse> {
  const response = await fetch("/api/ai/confirm", {
    body: JSON.stringify({ draft_id: draftId }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new AiApiError(await readErrorMessage(response));
  }

  const payload: unknown = await response.json();
  return parseAiConfirmResponse(payload);
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

export function getAiErrorMessageForStatus(
  status: number,
  action: "parse" | "confirm",
): string {
  if (status === 503) {
    return "AI provider is unavailable. Check the local provider and try again.";
  }
  if (status === 504) {
    return "AI provider timed out. Try again with a shorter message.";
  }
  if (status === 404) {
    return "AI draft was not found. Parse the message again before confirming.";
  }
  if (status === 422) {
    return action === "parse"
      ? "Message could not be parsed. Edit the text and try again."
      : "AI draft could not be confirmed. It may be expired, duplicate, or invalid.";
  }
  if (status === 502) {
    return action === "parse"
      ? "AI provider returned an invalid parse response."
      : "AI confirmation failed safely.";
  }

  return action === "parse"
    ? "Unable to parse the message."
    : "Unable to confirm the AI draft.";
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
