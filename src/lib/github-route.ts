import "server-only";

import { apiErrorResponse } from "@/lib/api-route";
import { githubApiTimeoutResponse } from "@/lib/api-timeout";
import { GitHubRateLimitError } from "@/lib/github";
import { isTimeoutError } from "@/lib/timeout";

class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

export { UserNotFoundError };

function isRateLimitMessage(message: string): boolean {
  return (
    message.includes("rate limit exceeded") ||
    message.includes("Rate limit exceeded") ||
    message.includes("GitHub API rate limit exceeded")
  );
}

export async function handleGithubApiRouteError(
  error: unknown,
  request: Request,
): Promise<Response> {
  if (error instanceof UserNotFoundError) {
    return apiErrorResponse({ error: "User not found" }, 404, { request });
  }

  if (error instanceof GitHubRateLimitError) {
    return apiErrorResponse(
      {
        error: "Rate limit exceeded",
        resetAt: error.resetAt,
      },
      429,
      { request },
    );
  }

  if (isTimeoutError(error)) {
    return githubApiTimeoutResponse(request);
  }

  const message = error instanceof Error ? error.message : "Unknown error";

  if (isRateLimitMessage(message)) {
    const resetMatch = message.match(/"reset":\s*(\d+)/);
    const resetAt =
      resetMatch !== null && resetMatch[1] !== undefined
        ? new Date(Number.parseInt(resetMatch[1], 10) * 1000).toISOString()
        : null;

    return apiErrorResponse(
      {
        error: "Rate limit exceeded",
        resetAt,
      },
      429,
      { request },
    );
  }

  return apiErrorResponse({ error: message }, 500, { request });
}
