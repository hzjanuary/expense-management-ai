import type { TransactionType } from "@/lib/transactions";

export type TransactionExportFormat = "csv" | "json";

export type TransactionExportOptions = {
  format: TransactionExportFormat;
  month?: string;
  category?: string;
  type?: TransactionType | "";
  q?: string;
};

export type SoftDeleteTransactionResponse = {
  id: string;
  deleted: true;
  deleted_at: string;
  account_balance_minor: number;
};

export type ClearAiHistoryResponse = {
  deleted_draft_count: number;
  preserved_transaction_count: number;
  cleared: boolean;
};

export class DataManagementApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "DataManagementApiError";
    this.status = status;
  }
}

export function buildTransactionExportUrl(
  options: TransactionExportOptions,
): string {
  if (options.format !== "csv" && options.format !== "json") {
    throw new DataManagementApiError("Choose CSV or JSON before exporting.", 422);
  }

  const params = new URLSearchParams();
  params.set("format", options.format);
  appendOptionalParam(params, "month", options.month);
  appendOptionalParam(params, "category", options.category);
  appendOptionalParam(params, "type", options.type);
  appendOptionalParam(params, "q", options.q);

  return `/api/transactions/export?${params.toString()}`;
}

export async function deleteTransaction(
  transactionId: string,
  signal?: AbortSignal,
): Promise<SoftDeleteTransactionResponse> {
  const trimmedId = transactionId.trim();
  if (!trimmedId) {
    throw new DataManagementApiError("Transaction ID is required.", 422);
  }

  const response = await fetch(
    `/api/transactions/${encodeURIComponent(trimmedId)}`,
    {
      cache: "no-store",
      method: "DELETE",
      signal,
    },
  );

  if (!response.ok) {
    throw new DataManagementApiError(
      await readDataManagementError(response, "Unable to delete transaction."),
      response.status,
    );
  }

  return parseSoftDeleteTransactionResponse(await response.json());
}

export async function clearAiHistory(
  signal?: AbortSignal,
): Promise<ClearAiHistoryResponse> {
  const response = await fetch("/api/ai/history", {
    cache: "no-store",
    method: "DELETE",
    signal,
  });

  if (!response.ok) {
    throw new DataManagementApiError(
      await readDataManagementError(response, "Unable to clear AI history."),
      response.status,
    );
  }

  return parseClearAiHistoryResponse(await response.json());
}

export async function readDataManagementError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function parseSoftDeleteTransactionResponse(
  payload: unknown,
): SoftDeleteTransactionResponse {
  if (!isRecord(payload)) {
    throw new DataManagementApiError("Invalid delete response.", 502);
  }

  const { id, deleted, deleted_at: deletedAt, account_balance_minor: balance } =
    payload;
  if (
    typeof id !== "string" ||
    deleted !== true ||
    typeof deletedAt !== "string" ||
    typeof balance !== "number" ||
    !Number.isInteger(balance)
  ) {
    throw new DataManagementApiError("Invalid delete response.", 502);
  }

  return {
    id,
    deleted,
    deleted_at: deletedAt,
    account_balance_minor: balance,
  };
}

export function parseClearAiHistoryResponse(
  payload: unknown,
): ClearAiHistoryResponse {
  if (!isRecord(payload)) {
    throw new DataManagementApiError("Invalid AI history response.", 502);
  }

  const {
    deleted_draft_count: deletedDraftCount,
    preserved_transaction_count: preservedTransactionCount,
    cleared,
  } = payload;

  if (
    typeof deletedDraftCount !== "number" ||
    !Number.isInteger(deletedDraftCount) ||
    typeof preservedTransactionCount !== "number" ||
    !Number.isInteger(preservedTransactionCount) ||
    typeof cleared !== "boolean"
  ) {
    throw new DataManagementApiError("Invalid AI history response.", 502);
  }

  return {
    deleted_draft_count: deletedDraftCount,
    preserved_transaction_count: preservedTransactionCount,
    cleared,
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
