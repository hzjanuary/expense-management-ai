const DEFAULT_API_BASE_URL = "http://127.0.0.1:8010";

function normalizeApiBaseUrl(value: string | undefined): string {
  const candidate = value?.trim();
  if (!candidate) {
    return DEFAULT_API_BASE_URL;
  }
  return candidate.replace(/\/+$/, "");
}

export const appConfig = {
  apiBaseUrl: normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
} as const;

export function getBackendApiBaseUrl(): string {
  return normalizeApiBaseUrl(
    process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
  );
}
