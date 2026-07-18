import { NextRequest } from "next/server";

import { proxyInsightRequest } from "@/app/api/ai/insight-proxy";
import { parseAiQuerySpendingResponse } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyInsightRequest(
    request,
    "/api/v1/ai/query-spending",
    parseAiQuerySpendingResponse,
  );
}
