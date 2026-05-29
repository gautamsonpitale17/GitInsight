export const USER_NOT_FOUND_MESSAGE = "User not found";
export const RATE_LIMIT_MESSAGE = "Rate limit exceeded";
export const GITHUB_API_TIMEOUT_MESSAGE = "GitHub API timeout";

export type DashboardError = Error & {
  resetAt?: string;
};

export function isGithubApiTimeoutError(message: string): boolean {
  return message === GITHUB_API_TIMEOUT_MESSAGE;
}

export function createRateLimitError(resetAt: string): DashboardError {
  const error = new Error(RATE_LIMIT_MESSAGE) as DashboardError;
  error.name = "RateLimitExceededError";
  error.resetAt = resetAt;
  return error;
}

export function getErrorResetAt(error: Error): string | null {
  const withReset = error as DashboardError;
  if (withReset.resetAt) {
    return withReset.resetAt;
  }

  const marker = `${RATE_LIMIT_MESSAGE}::`;
  if (error.message.startsWith(marker)) {
    return error.message.slice(marker.length);
  }

  return null;
}

export function isUserNotFoundError(error: Error): boolean {
  return error.message === USER_NOT_FOUND_MESSAGE;
}

export function isRateLimitError(error: Error): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  return (
    error.message === RATE_LIMIT_MESSAGE ||
    error.message.startsWith(`${RATE_LIMIT_MESSAGE}::`) ||
    getErrorResetAt(error) !== null
  );
}
