import "server-only";

import { fetchGitHubGraphQL } from "@/lib/github-graphql";

export type ProfileSocialAccount = {
  provider: string;
  url: string;
};

type SocialAccountsResponse = {
  user: {
    socialAccounts: {
      nodes: Array<{
        provider: string;
        url: string;
      }>;
    } | null;
  } | null;
};

const SOCIAL_ACCOUNTS_QUERY = `
  query ProfileSocialAccounts($login: String!) {
    user(login: $login) {
      socialAccounts(first: 20) {
        nodes {
          provider
          url
        }
      }
    }
  }
`;

/** Fetches LinkedIn and other social links from GitHub GraphQL (not in REST user). */
export async function fetchGitHubSocialAccounts(
  login: string,
): Promise<ProfileSocialAccount[]> {
  try {
    const data = await fetchGitHubGraphQL<SocialAccountsResponse>(SOCIAL_ACCOUNTS_QUERY, {
      login,
    });

    return (
      data.user?.socialAccounts?.nodes?.filter(
        (node): node is ProfileSocialAccount => Boolean(node?.url),
      ) ?? []
    );
  } catch {
    return [];
  }
}
