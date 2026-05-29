/** Fallback showcase account when `NEXT_PUBLIC_PORTFOLIO_GITHUB_USERNAME` is unset. */
export const DEFAULT_PORTFOLIO_GITHUB_USERNAME = "torvalds";

/** GitHub login shown on the home page live contribution heatmap. */
export function getPortfolioGithubUsername(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PORTFOLIO_GITHUB_USERNAME?.trim();
  return fromEnv || DEFAULT_PORTFOLIO_GITHUB_USERNAME;
}
