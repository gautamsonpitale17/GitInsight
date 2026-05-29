import { apiErrorResponse, apiJsonResponse } from "@/lib/api-route";
import { cache, CacheKeys, isCacheWarmRequest } from "@/lib/cache";
import { fetchGitHub } from "@/lib/github-fetch";
import {
  handleGithubApiRouteError,
  UserNotFoundError,
} from "@/lib/github-route";
import {
  extractGitHubRateLimitResetAt,
  isGitHubRateLimitResponse,
  shouldRejectGitHubRateLimit,
} from "@/lib/rate-limit-env";
import { GITHUB_API_TIMEOUT_MS, withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const SECONDARY_FETCH_TIMEOUT_MS = 3000;
const TOP_NETWORK_SIZE = 6;

interface GitHubListUser {
  login: string;
  avatar_url: string;
}

interface GitHubUserResponse {
  followers: number;
  following: number;
}

interface NetworkUser {
  login: string;
  avatar_url: string;
}

interface NetworkResponse {
  followers_count: number;
  following_count: number;
  mutual_count: number;
  top_followers: NetworkUser[];
  top_following: NetworkUser[];
}

class RateLimitExceededError extends Error {
  constructor(public resetAt: string | null) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

function mapTopUsers(users: GitHubListUser[]): NetworkUser[] {
  return users.slice(0, TOP_NETWORK_SIZE).map((user) => ({
    login: user.login,
    avatar_url: user.avatar_url,
  }));
}

function countMutualFollows(followers: GitHubListUser[], following: GitHubListUser[]): number {
  const followingLogins = new Set(following.map((user) => user.login));
  return followers.filter((user) => followingLogins.has(user.login)).length;
}

async function withGracefulTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function fetchRelationshipPage(
  username: string,
  relationship: "followers" | "following",
): Promise<GitHubListUser[]> {
  const response = await fetchGitHub(
    `/users/${encodeURIComponent(username)}/${relationship}?per_page=100&page=1`,
  );

  if (response.status === 404) {
    return [];
  }

  if (isGitHubRateLimitResponse(response)) {
    if (shouldRejectGitHubRateLimit(response)) {
      throw Object.assign(new Error("Rate limit exceeded"), {
        rateLimited: true,
        resetAt: extractGitHubRateLimitResetAt(response),
      });
    }

    return [];
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API request failed (${response.status} ${response.statusText}): ${errorBody}`,
    );
  }

  return (await response.json()) as GitHubListUser[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiErrorResponse({ error: "username query parameter is required" }, 400, { request });
    }

    const { data: payload, status } = await cache(
      CacheKeys.network(username),
      (): Promise<NetworkResponse> =>
        withTimeout(
          (async (): Promise<NetworkResponse> => {
            const userResponse = await fetchGitHub(`/users/${encodeURIComponent(username)}`);

            if (userResponse.status === 404) {
              throw new UserNotFoundError();
            }

            if (shouldRejectGitHubRateLimit(userResponse)) {
              throw new RateLimitExceededError(extractGitHubRateLimitResetAt(userResponse));
            }

            if (!userResponse.ok) {
              const errorBody = await userResponse.text();
              throw new Error(
                `GitHub API request failed (${userResponse.status} ${userResponse.statusText}): ${errorBody}`,
              );
            }

            const user = (await userResponse.json()) as GitHubUserResponse;

            const [followersPage, followingPage] = await Promise.all([
              withGracefulTimeout(fetchRelationshipPage(username, "followers"), SECONDARY_FETCH_TIMEOUT_MS),
              withGracefulTimeout(fetchRelationshipPage(username, "following"), SECONDARY_FETCH_TIMEOUT_MS),
            ]);

            const followers = followersPage ?? [];
            const following = followingPage ?? [];

            return {
              followers_count: user.followers,
              following_count: user.following,
              mutual_count: countMutualFollows(followers, following),
              top_followers: mapTopUsers(followers),
              top_following: mapTopUsers(following),
            };
          })(),
          GITHUB_API_TIMEOUT_MS,
        ),
      600,
      { skipWrite: isCacheWarmRequest(request) },
    );

    return apiJsonResponse(payload, { sMaxAge: 600 }, { headers: { "X-Cache": status }, request });
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

    if (
      error instanceof Error &&
      "rateLimited" in error &&
      (error as Error & { rateLimited: boolean }).rateLimited
    ) {
      return apiErrorResponse(
        {
          error: "Rate limit exceeded",
          resetAt: (error as Error & { resetAt?: string | null }).resetAt ?? null,
        },
        429,
        { request },
      );
    }

    return handleGithubApiRouteError(error, request);
  }
}
