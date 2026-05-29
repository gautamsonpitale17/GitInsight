import type { NextRequest } from "next/server";
import { aggregateDashboardData } from "@/lib/analytics";
import { apiErrorResponse } from "@/lib/api-route";
import {
  RATE_LIMIT_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
} from "@/lib/dashboard-errors";
import {
  checkExportRateLimit,
  EXPORT_RATE_LIMIT_MAX,
  getClientIp,
} from "@/lib/export-rate-limit";
import { isRateLimitEnforced } from "@/lib/rate-limit-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExportRouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(request: NextRequest, context: ExportRouteContext) {
  const rateLimit = await checkExportRateLimit(getClientIp(request));

  if (!rateLimit.allowed) {
    return apiErrorResponse(
      {
        error: "Export rate limit exceeded. Try again later.",
        limit: EXPORT_RATE_LIMIT_MAX,
        resetAt: new Date(rateLimit.resetAt * 1000).toISOString(),
      },
      429,
    );
  }

  const { username } = await context.params;
  // server-only: aggregateDashboardData
  const data = await aggregateDashboardData(username);

  if (!data.profile) {
    const profileError = data.errors.find((entry) => entry.section === "profile");

    if (profileError?.message === USER_NOT_FOUND_MESSAGE) {
      return apiErrorResponse({ error: USER_NOT_FOUND_MESSAGE }, 404);
    }

    if (isRateLimitEnforced() && profileError?.message === RATE_LIMIT_MESSAGE) {
      return apiErrorResponse(
        {
          error: RATE_LIMIT_MESSAGE,
          resetAt: profileError.resetAt ?? null,
        },
        429,
      );
    }
  }

  const safeUsername = data.username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const filename = `gitinsight-${safeUsername || "export"}.json`;
  const body = JSON.stringify(data, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Export-RateLimit-Remaining": String(rateLimit.remaining),
      "X-Export-RateLimit-Reset": String(rateLimit.resetAt),
    },
  });
}
