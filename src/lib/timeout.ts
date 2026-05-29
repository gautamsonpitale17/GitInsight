export const GITHUB_API_TIMEOUT_MS = 8000;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
  );
  return Promise.race([promise, timeout]);
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Timeout after");
}
