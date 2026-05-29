import "server-only";

import { fetchGitHubGraphQL } from "@/lib/github-graphql";
import {
  formatProfileLinkLabel,
  type ProfileSocialLink,
} from "@/lib/profile-display";

type SocialAccountsResponse = {
  user: {
    socialAccounts: {
      nodes: Array<{
        displayLabel: string | null;
        url: string;
      }>;
    } | null;
  } | null;
};

const SOCIAL_ACCOUNTS_QUERY = `
  query ProfileSocialAccounts($login: String!) {
    user(login: $login) {
      socialAccounts(first: 12) {
        nodes {
          displayLabel
          url
        }
      }
    }
  }
`;

/** GitHub GraphQL social accounts (LinkedIn, etc.) for the profile sidebar. */
export async function fetchProfileSocialAccounts(
  login: string,
): Promise<ProfileSocialLink[]> {
  try {
    const data = await fetchGitHubGraphQL<SocialAccountsResponse>(SOCIAL_ACCOUNTS_QUERY, {
      login,
    });

    const nodes = data.user?.socialAccounts?.nodes ?? [];

    return nodes
      .filter((node) => node.url?.trim())
      .map((node) => {
        const href = node.url.trim();
        const label =
          node.displayLabel?.trim() || formatProfileLinkLabel(href);
        return { href, label };
      });
  } catch {
    return [];
  }
}
