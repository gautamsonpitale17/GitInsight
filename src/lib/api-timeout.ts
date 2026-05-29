import "server-only";

import { apiErrorResponse } from "@/lib/api-route";

export async function githubApiTimeoutResponse(request: Request): Promise<Response> {
  return apiErrorResponse({ error: "GitHub API timeout", retryAfter: 10 }, 504, { request });
}
