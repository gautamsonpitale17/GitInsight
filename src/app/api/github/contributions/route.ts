import { fetchGitHubContributions } from "@/lib/contributions";
import { apiErrorResponse, apiJsonResponse } from "@/lib/api-route";
import { cacheWithSWR, CacheKeys, isCacheWarmRequest } from "@/lib/cache";
import { fetchGitHub } from "@/lib/github-fetch";
import { handleGithubApiRouteError, UserNotFoundError } from "@/lib/github-route";
import { GITHUB_API_TIMEOUT_MS, withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GitHubUserCreatedAt {
  created_at: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiErrorResponse({ error: "username query parameter is required" }, 400, { request });
    }

    const { data, status } = await cacheWithSWR(
      CacheKeys.contributions(username),
      () =>
        withTimeout(
          (async () => {
            const userResponse = await fetchGitHub(
              `/users/${encodeURIComponent(username)}`,
            );

            if (userResponse.status === 404) {
              throw new UserNotFoundError();
            }

            if (!userResponse.ok) {
              const errorBody = await userResponse.text();
              throw new Error(
                `GitHub API request failed (${userResponse.status}): ${errorBody}`,
              );
            }

            const user = (await userResponse.json()) as GitHubUserCreatedAt;
            const contributions = await fetchGitHubContributions(username, user.created_at);

            if (!contributions) {
              throw new Error("Unable to load GitHub contribution calendar");
            }

            return contributions;
          })(),
          GITHUB_API_TIMEOUT_MS,
        ),
      3600,
      1800,
      { skipWrite: isCacheWarmRequest(request) },
    );

    return apiJsonResponse(
      data,
      { sMaxAge: 300, staleWhileRevalidate: 3300 },
      { headers: { "X-Cache": status }, request },
    );
  } catch (error) {
    return handleGithubApiRouteError(error, request);
  }
}
