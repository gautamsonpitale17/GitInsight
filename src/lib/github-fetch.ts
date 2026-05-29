import "server-only";

import {
  extractGitHubRateLimitResetAt,
  isGitHubRateLimitResponse,
} from "@/lib/rate-limit-env";

export const GITHUB_API_BASE_URL = "https://api.github.com";

const GITHUB_USER_AGENT =
  process.env.GITHUB_USER_AGENT ?? "GitInsight/1.0 (+https://github.com/gitinsight)";

/** Skip token auth until this timestamp (ms) after a 403 rate-limit on the PAT. */
let tokenRateLimitedUntilMs = 0;

export function resolveGitHubUrl(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${GITHUB_API_BASE_URL}${pathOrUrl}`;
}

export function buildGitHubHeaders(options?: { token?: string | null }): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": GITHUB_USER_AGENT,
  };

  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  return headers;
}

function mergeHeaders(base: HeadersInit, extra?: HeadersInit): HeadersInit {
  const merged = new Headers(base);
  if (extra) {
    new Headers(extra).forEach((value, key) => {
      merged.set(key, value);
    });
  }
  return merged;
}

/** Fetch GitHub REST API; retries without auth when the token is rate-limited. */
export async function fetchGitHub(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const url = resolveGitHubUrl(pathOrUrl);
  const token = process.env.GITHUB_TOKEN?.trim() || null;
  const nowMs = Date.now();

  const requestInit: RequestInit = {
    ...init,
    cache: init?.cache ?? "no-store",
  };

  if (token && nowMs >= tokenRateLimitedUntilMs) {
    const authedResponse = await fetch(url, {
      ...requestInit,
      headers: mergeHeaders(buildGitHubHeaders({ token }), init?.headers),
    });

    if (!isGitHubRateLimitResponse(authedResponse)) {
      return authedResponse;
    }

    const resetAt = extractGitHubRateLimitResetAt(authedResponse);
    if (resetAt) {
      tokenRateLimitedUntilMs = new Date(resetAt).getTime();
    } else {
      tokenRateLimitedUntilMs = nowMs + 60 * 60 * 1000;
    }

    await authedResponse.body?.cancel().catch(() => undefined);
  }

  return fetch(url, {
    ...requestInit,
    headers: mergeHeaders(buildGitHubHeaders({ token: null }), init?.headers),
  });
}

export function getGitHubRateLimitResetAt(response: Response): string | null {
  return extractGitHubRateLimitResetAt(response);
}
