import { apiErrorResponse, apiJsonResponse } from "@/lib/api-route";
import { cache, CacheKeys, isCacheWarmRequest } from "@/lib/cache";
import { GitHubClient } from "@/lib/github";
import { handleGithubApiRouteError } from "@/lib/github-route";
import { GITHUB_API_TIMEOUT_MS, withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GitHubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  topics?: string[];
}

interface RepoSummary {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  topics: string[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiErrorResponse({ error: "username query parameter is required" }, 400, { request });
    }

    const { data, status } = await cache(
      CacheKeys.repos(username),
      () =>
        withTimeout(
          (async () => {
            const github = new GitHubClient();
            const { data: repos, totalFetched, pages } = await github.fetchPaginated<GitHubRepo>(
              `/users/${encodeURIComponent(username)}/repos`,
              { per_page: 100, page: 1, type: "public", sort: "updated" },
              3,
            );

            const languagesSummary: Record<string, number> = {};

            for (const repo of repos) {
              if (!repo.language) {
                continue;
              }

              languagesSummary[repo.language] = (languagesSummary[repo.language] ?? 0) + 1;
            }

            const topRepos: RepoSummary[] = repos
              .slice()
              .sort((a, b) => b.stargazers_count - a.stargazers_count)
              .slice(0, 20)
              .map((repo) => ({
                name: repo.name,
                description: repo.description,
                stargazers_count: repo.stargazers_count,
                forks_count: repo.forks_count,
                language: repo.language,
                html_url: repo.html_url,
                created_at: repo.created_at,
                updated_at: repo.updated_at,
                topics: repo.topics ?? [],
              }));

            return {
              repos: topRepos,
              languages_summary: languagesSummary,
              total_fetched: totalFetched,
              pages,
            };
          })(),
          GITHUB_API_TIMEOUT_MS,
        ),
      600,
      { skipWrite: isCacheWarmRequest(request) },
    );

    return apiJsonResponse(data, { sMaxAge: 600 }, { headers: { "X-Cache": status }, request });
  } catch (error) {
    return handleGithubApiRouteError(error, request);
  }
}
