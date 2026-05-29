import "server-only";

import { setRateLimitState } from "@/lib/cache";
import { fetchGitHub, getGitHubRateLimitResetAt } from "@/lib/github-fetch";
import { isGitHubRateLimitResponse, isRateLimitEnforced } from "@/lib/rate-limit-env";
import type { GitHubRateLimit, GitHubRateLimitPayload } from "@/types/github";

export class GitHubRateLimitError extends Error {
  readonly resetAt: string;

  constructor(resetAt: string) {
    super(`GitHub API rate limit exceeded. Try again after ${resetAt}.`);
    this.name = "GitHubRateLimitError";
    this.resetAt = resetAt;
  }
}

export class GitHubClient {
  async fetchPaginated<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | null | undefined>,
    maxPages = 10,
  ): Promise<{ data: T[]; totalFetched: number; pages: number }> {
    const queryParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    }

    const initialUrl =
      queryParams.size > 0 ? `${endpoint}?${queryParams.toString()}` : endpoint;

    const data: T[] = [];
    let pages = 0;
    let nextUrl: string | null = initialUrl;

    while (nextUrl && pages < maxPages) {
      const response = await fetchGitHub(nextUrl);

      await this.trackRateLimit(response);

      if (!response.ok) {
        if (isGitHubRateLimitResponse(response)) {
          throw new GitHubRateLimitError(
            getGitHubRateLimitResetAt(response) ?? new Date().toISOString(),
          );
        }

        const errorBody = await response.text();
        throw new Error(
          `GitHub API request failed (${response.status} ${response.statusText}): ${errorBody}`,
        );
      }

      const pageData = (await response.json()) as T[];
      data.push(...pageData);
      pages += 1;

      nextUrl = this.getNextPageUrl(response.headers.get("link"));

      if (nextUrl && pages < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return { data, totalFetched: data.length, pages };
  }

  async getRateLimit(): Promise<GitHubRateLimit> {
    const response = await fetchGitHub("/rate_limit");

    if (!response.ok) {
      if (isGitHubRateLimitResponse(response)) {
        throw new GitHubRateLimitError(
          getGitHubRateLimitResetAt(response) ?? new Date().toISOString(),
        );
      }

      const errorBody = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status} ${response.statusText}): ${errorBody}`,
      );
    }

    const payload = (await response.json()) as GitHubRateLimitPayload;
    const core = payload.resources.core;
    const resetAt = new Date(core.reset * 1000).toISOString();

    if (isRateLimitEnforced() && core.remaining === 0) {
      throw new GitHubRateLimitError(resetAt);
    }

    return {
      remaining: core.remaining,
      limit: core.limit,
      resetAt,
    };
  }

  private async trackRateLimit(response: Response): Promise<void> {
    if (!isRateLimitEnforced()) {
      return;
    }

    const remainingHeader = response.headers.get("x-ratelimit-remaining");
    const resetHeader = response.headers.get("x-ratelimit-reset");

    if (remainingHeader === null || resetHeader === null) {
      return;
    }

    const remaining = Number.parseInt(remainingHeader, 10);
    const resetAt = Number.parseInt(resetHeader, 10);

    if (!Number.isFinite(remaining) || !Number.isFinite(resetAt)) {
      return;
    }

    await setRateLimitState(remaining, resetAt);

    if (remaining < 10) {
      console.warn(
        `GitHub API rate limit low: ${remaining} requests remaining (resets at ${new Date(resetAt * 1000).toISOString()})`,
      );
    }
  }

  private getNextPageUrl(linkHeader: string | null): string | null {
    if (!linkHeader) {
      return null;
    }

    const links = linkHeader.split(",");

    for (const link of links) {
      const [urlPart, relPart] = link.split(";").map((segment) => segment.trim());

      if (relPart?.includes('rel="next"') && urlPart?.startsWith("<") && urlPart.endsWith(">")) {
        return urlPart.slice(1, -1);
      }
    }

    return null;
  }
}
