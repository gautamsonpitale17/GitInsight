import { apiErrorResponse, apiJsonResponse } from "@/lib/api-route";
import { cache, CacheKeys, isCacheWarmRequest } from "@/lib/cache";
import { GitHubClient } from "@/lib/github";
import { fetchGitHub } from "@/lib/github-fetch";
import { handleGithubApiRouteError, UserNotFoundError } from "@/lib/github-route";
import { GITHUB_API_TIMEOUT_MS, withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GitHubUserProfile {
  starred_url: string;
}

interface GitHubStarredRepo {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  owner: {
    avatar_url: string;
  };
}

interface StarredRepoSummary {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  owner: {
    avatar_url: string;
  };
}

interface StarsResponse {
  repos: StarredRepoSummary[];
  total_starred_count: number;
}

function getLastPageFromLinkHeader(linkHeader: string | null): number | null {
  if (!linkHeader) {
    return null;
  }

  const links = linkHeader.split(",");
  const lastLink = links.find((link) => link.includes('rel="last"'));

  if (!lastLink) {
    return null;
  }

  const match = lastLink.match(/<([^>]+)>/);
  const lastUrl = match?.[1];

  if (!lastUrl) {
    return null;
  }

  const page = new URL(lastUrl).searchParams.get("page");
  if (!page) {
    return null;
  }

  const parsedPage = Number.parseInt(page, 10);
  return Number.isFinite(parsedPage) ? parsedPage : null;
}

async function fetchTotalStarredCount(starredUrlTemplate: string): Promise<number> {
  const starredBaseUrl = starredUrlTemplate.replace("{/owner}{/repo}", "");
  const response = await fetchGitHub(`${starredBaseUrl}?per_page=1&page=1`);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API request failed (${response.status} ${response.statusText}): ${errorBody}`,
    );
  }

  const entries = (await response.json()) as unknown[];
  const lastPage = getLastPageFromLinkHeader(response.headers.get("link"));

  if (lastPage !== null) {
    return lastPage;
  }

  return entries.length;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiErrorResponse({ error: "username query parameter is required" }, 400, { request });
    }

    const { data, status } = await cache(
      CacheKeys.stars(username),
      (): Promise<StarsResponse> =>
        withTimeout(
          (async (): Promise<StarsResponse> => {
            const github = new GitHubClient();
            const { data: starredRepos } = await github.fetchPaginated<GitHubStarredRepo>(
              `/users/${encodeURIComponent(username)}/starred`,
              { per_page: 30, page: 1 },
              2,
            );

            const userResponse = await fetchGitHub(`/users/${encodeURIComponent(username)}`);

            if (userResponse.status === 404) {
              throw new UserNotFoundError();
            }

            if (!userResponse.ok) {
              const errorBody = await userResponse.text();
              throw new Error(
                `GitHub API request failed (${userResponse.status} ${userResponse.statusText}): ${errorBody}`,
              );
            }

            const profile = (await userResponse.json()) as GitHubUserProfile;
            const totalStarredCount = await fetchTotalStarredCount(profile.starred_url);

            const topStarred: StarredRepoSummary[] = starredRepos
              .slice()
              .sort((a, b) => b.stargazers_count - a.stargazers_count)
              .slice(0, 20)
              .map((repo) => ({
                full_name: repo.full_name,
                description: repo.description,
                stargazers_count: repo.stargazers_count,
                language: repo.language,
                html_url: repo.html_url,
                owner: {
                  avatar_url: repo.owner.avatar_url,
                },
              }));

            return {
              repos: topStarred,
              total_starred_count: totalStarredCount,
            };
          })(),
          GITHUB_API_TIMEOUT_MS,
        ),
      3600,
      { skipWrite: isCacheWarmRequest(request) },
    );

    return apiJsonResponse(data, { sMaxAge: 3600 }, { headers: { "X-Cache": status }, request });
  } catch (error) {
    return handleGithubApiRouteError(error, request);
  }
}
