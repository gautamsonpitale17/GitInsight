import { apiErrorResponse, apiJsonResponse } from "@/lib/api-route";
import { cache, CacheKeys, isCacheWarmRequest } from "@/lib/cache";
import { GitHubClient } from "@/lib/github";
import { fetchGitHub } from "@/lib/github-fetch";
import { handleGithubApiRouteError } from "@/lib/github-route";
import { GITHUB_API_TIMEOUT_MS, withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GitHubRepo {
  name: string;
  stargazers_count: number;
  owner: {
    login: string;
  };
}

interface LanguageStats {
  language: string;
  bytes: number;
  percentage: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiErrorResponse({ error: "username query parameter is required" }, 400, { request });
    }

    const { data, status } = await cache(
      CacheKeys.languages(username),
      () =>
        withTimeout(
          (async () => {
            const github = new GitHubClient();
            const { data: repos } = await github.fetchPaginated<GitHubRepo>(
              `/users/${encodeURIComponent(username)}/repos`,
              { per_page: 100, page: 1, type: "public", sort: "updated" },
              2,
            );

            const topRepos = repos
              .slice()
              .sort((a, b) => b.stargazers_count - a.stargazers_count)
              .slice(0, 10);

            const languageRequests = topRepos.map(async (repo) => {
              const response = await fetchGitHub(
                `/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/languages`,
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch languages for ${repo.owner.login}/${repo.name}`);
              }

              return (await response.json()) as Record<string, number>;
            });

            const settledResults = await Promise.allSettled(languageRequests);
            const totalsByLanguage: Record<string, number> = {};

            for (const result of settledResults) {
              if (result.status !== "fulfilled") {
                continue;
              }

              for (const [language, bytes] of Object.entries(result.value)) {
                totalsByLanguage[language] = (totalsByLanguage[language] ?? 0) + bytes;
              }
            }

            const totalBytes = Object.values(totalsByLanguage).reduce((sum, value) => sum + value, 0);

            const languages: LanguageStats[] = Object.entries(totalsByLanguage)
              .map(([language, bytes]) => ({
                language,
                bytes,
                percentage: totalBytes === 0 ? 0 : Number(((bytes / totalBytes) * 100).toFixed(2)),
              }))
              .sort((a, b) => b.bytes - a.bytes)
              .slice(0, 10);

            return {
              languages,
              total_bytes: totalBytes,
            };
          })(),
          GITHUB_API_TIMEOUT_MS,
        ),
      1800,
      { skipWrite: isCacheWarmRequest(request) },
    );

    return apiJsonResponse(data, { sMaxAge: 1800 }, { headers: { "X-Cache": status }, request });
  } catch (error) {
    return handleGithubApiRouteError(error, request);
  }
}
