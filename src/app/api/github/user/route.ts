import { apiErrorResponse, apiJsonResponse } from "@/lib/api-route";
import { cacheWithSWR, CacheKeys, isCacheWarmRequest, redis } from "@/lib/cache";
import { warmGithubApiCache } from "@/lib/cache-warm";
import { fetchGitHub } from "@/lib/github-fetch";
import {
  handleGithubApiRouteError,
  UserNotFoundError,
} from "@/lib/github-route";
import {
  extractGitHubRateLimitResetAt,
  isGitHubRateLimitResponse,
  isRateLimitEnforced,
  shouldRejectGitHubRateLimit,
} from "@/lib/rate-limit-env";
import { GITHUB_API_TIMEOUT_MS, withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GitHubUserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  blog: string;
  twitter_username: string | null;
}

interface UserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  blog: string;
  twitter_username: string | null;
}

class RateLimitExceededError extends Error {
  constructor(public resetAt: string | null) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiErrorResponse({ error: "username query parameter is required" }, 400, { request });
    }

    const { data: profile, status } = await cacheWithSWR(
      CacheKeys.user(username),
      (): Promise<UserProfile> =>
        withTimeout(
          (async (): Promise<UserProfile> => {
        const userResponse = await fetchGitHub(`/users/${encodeURIComponent(username)}`);

        if (userResponse.status === 404) {
          throw new UserNotFoundError();
        }

        if (shouldRejectGitHubRateLimit(userResponse)) {
          throw new RateLimitExceededError(extractGitHubRateLimitResetAt(userResponse));
        }

        if (isGitHubRateLimitResponse(userResponse) && !isRateLimitEnforced()) {
          const cached = await redis.get<UserProfile>(CacheKeys.user(username));
          if (cached) {
            return cached;
          }
        }

        if (!userResponse.ok) {
          const errorBody = await userResponse.text();
          throw new Error(
            `GitHub API request failed (${userResponse.status} ${userResponse.statusText}): ${errorBody}`,
          );
        }

        const user = (await userResponse.json()) as GitHubUserResponse;

        return {
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          company: user.company,
          location: user.location,
          public_repos: user.public_repos,
          public_gists: user.public_gists,
          followers: user.followers,
          following: user.following,
          created_at: user.created_at,
          blog: user.blog,
          twitter_username: user.twitter_username,
        };
          })(),
          GITHUB_API_TIMEOUT_MS,
        ),
      300,
      3000,
      { skipWrite: isCacheWarmRequest(request) },
    );

    if (status === "MISS") {
      warmGithubApiCache(username);
    }

    return apiJsonResponse(
      profile,
      { sMaxAge: 300, staleWhileRevalidate: 2700 },
      { headers: { "X-Cache": status }, request },
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return apiErrorResponse(
        {
          error: "Rate limit exceeded",
          resetAt: error.resetAt,
        },
        429,
        { request },
      );
    }

    return handleGithubApiRouteError(error, request);
  }
}
