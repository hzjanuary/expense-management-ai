export type TransactionType = "expense" | "income";

export type TransactionSource = "manual" | "ai_chat" | "import" | string;

export type TransactionListItem = {
  id: string;
  type: TransactionType;
  amount_minor: number;
  currency: string;
  category_slug: string;
  description: string;
  merchant: string | null;
  occurred_at: string;
  source: TransactionSource;
};

export type TransactionListResponse = {
  items: TransactionListItem[];
  limit: number;
  offset: number;
  total: number;
};

export type TransactionListFilters = {
  category?: string;
  limit?: number;
  month?: string;
  offset?: number;
  q?: string;
  type?: TransactionType | "";
};

export class TransactionApiError extends Error {
  constructor(message = "Unable to load recent transactions") {
    super(message);
    this.name = "TransactionApiError";
  }
}

export async function fetchRecentTransactions(
  filters: TransactionListFilters = {},
  signal?: AbortSignal,
): Promise<TransactionListResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(filters.limit ?? 10));
  params.set("offset", String(filters.offset ?? 0));
  appendOptionalParam(params, "month", filters.month);
  appendOptionalParam(params, "category", filters.category);
  appendOptionalParam(params, "type", filters.type);
  appendOptionalParam(params, "q", filters.q);

  const response = await fetch(`/api/transactions?${params.toString()}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new TransactionApiError();
  }

  const payload: unknown = await response.json();
  return parseTransactionListResponse(payload);
}

function appendOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) {
  const trimmed = value?.trim();
  if (trimmed) {
    params.set(key, trimmed);
  }
}

export function parseTransactionListResponse(
  payload: unknown,
): TransactionListResponse {
  if (!isRecord(payload)) {
    throw new TransactionApiError("Invalid transaction response");
  }

  const { items, limit, offset, total } = payload;
  if (
    !Array.isArray(items) ||
    !Number.isInteger(limit) ||
    !Number.isInteger(offset) ||
    !Number.isInteger(total)
  ) {
    throw new TransactionApiError("Invalid transaction response");
  }

  return {
    items: items.map(parseTransactionListItem),
    limit: Number(limit),
    offset: Number(offset),
    total: Number(total),
  };
}

function parseTransactionListItem(payload: unknown): TransactionListItem {
  if (!isRecord(payload)) {
    throw new TransactionApiError("Invalid transaction row");
  }

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
    !isTransactionType(type) ||
    typeof amountMinor !== "number" ||
    !Number.isInteger(amountMinor) ||
    typeof currency !== "string" ||
    typeof categorySlug !== "string" ||
    typeof description !== "string" ||
    !(typeof merchant === "string" || merchant === null) ||
    typeof occurredAt !== "string" ||
    typeof source !== "string"
  ) {
    throw new TransactionApiError("Invalid transaction row");
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

function isTransactionType(value: unknown): value is TransactionType {
  return value === "expense" || value === "income";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
