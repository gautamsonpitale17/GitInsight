import "server-only";

import { fetchGitHub } from "@/lib/github-fetch";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export class GitHubGraphQLError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubGraphQLError";
  }
}

/** Executes a GitHub GraphQL query using the same token / rate-limit handling as REST. */
export async function fetchGitHubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetchGitHub(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new GitHubGraphQLError(
      `GitHub GraphQL request failed (${response.status}): ${body}`,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new GitHubGraphQLError(payload.errors.map((error) => error.message).join("; "));
  }

  if (!payload.data) {
    throw new GitHubGraphQLError("GitHub GraphQL response missing data");
  }

  return payload.data;
}
