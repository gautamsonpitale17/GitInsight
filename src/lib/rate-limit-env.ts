import "server-only";

/** GitHub/export rate-limit UX and 429 responses apply in production only. */
export function isRateLimitEnforced(): boolean {
  return process.env.NODE_ENV === "production";
}

export function extractGitHubRateLimitResetAt(response: Response): string | null {
  const resetUnix = response.headers.get("x-ratelimit-reset");
  if (!resetUnix) {
    return null;
  }

  const resetSeconds = Number.parseInt(resetUnix, 10);
  if (!Number.isFinite(resetSeconds)) {
    return null;
  }

  return new Date(resetSeconds * 1000).toISOString();
}

export function isGitHubRateLimitResponse(response: Response): boolean {
  const remaining = response.headers.get("x-ratelimit-remaining");
  return response.status === 403 && remaining === "0";
}

/** Whether the app should surface GitHub rate limits as errors (429, UI, toasts). */
export function shouldRejectGitHubRateLimit(response: Response): boolean {
  return isRateLimitEnforced() && isGitHubRateLimitResponse(response);
}
