import "server-only";

import { fetchGitHubContributions, type ContributionsPayload } from "@/lib/contributions";
import { fetchGitHub } from "@/lib/github-fetch";

interface GitHubUserCreatedAt {
  created_at: string;
}

/** Server-side contribution calendar for the portfolio heatmap (SSR + hydration). */
export async function loadPortfolioContributions(
  username: string,
): Promise<ContributionsPayload | null> {
  try {
    const userResponse = await fetchGitHub(`/users/${encodeURIComponent(username)}`);

    if (!userResponse.ok) {
      return null;
    }

    const user = (await userResponse.json()) as GitHubUserCreatedAt;
    return fetchGitHubContributions(username, user.created_at);
  } catch {
    return null;
  }
}
