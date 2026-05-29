import {
  fetchDashboardActivity,
  fetchDashboardLanguages,
  fetchDashboardProfile,
  fetchDashboardRepos,
  fetchDashboardStreaks,
} from "@/lib/analytics";
import { getGithubAvatarUrl } from "@/lib/avatar";
import { buildHeatmapPreview } from "@/lib/og-heatmap";
import type { HeatmapLevel } from "@/types/github";

export type OgDashboardData = {
  login: string;
  displayName: string;
  avatarUrl: string;
  repos: number;
  stars: number;
  streak: number;
  languages: number;
  heatmapPreview: HeatmapLevel[][];
};

export async function fetchOgDashboardData(username: string): Promise<OgDashboardData> {
  const login = username.trim();

  const [profileResult, activityResult, reposResult, streaksResult, languagesResult] =
    await Promise.all([
      fetchDashboardProfile(login),
      fetchDashboardActivity(login),
      fetchDashboardRepos(login),
      fetchDashboardStreaks(login),
      fetchDashboardLanguages(login),
    ]);

  const profile = profileResult.profile;
  const displayLogin = profile?.login ?? login;
  const displayName = profile?.name ?? displayLogin;

  const totalStars =
    reposResult.repos?.repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) ?? 0;

  const languagesUsed =
    languagesResult.languages?.length ??
    Object.keys(reposResult.repos?.languagesSummary ?? {}).length;

  return {
    login: displayLogin,
    displayName,
    avatarUrl: profile?.avatar_url ?? getGithubAvatarUrl(displayLogin, 240),
    repos: profile?.public_repos ?? 0,
    stars: totalStars,
    streak: streaksResult.streaks?.current ?? 0,
    languages: languagesUsed,
    heatmapPreview: buildHeatmapPreview(
      activityResult.activity?.rollingYearContributions?.heatmap ??
        activityResult.activity?.heatmap,
    ),
  };
}
