/** Dashboard data is considered stale after this many seconds (matches page `revalidate`). */
export const DASHBOARD_FRESH_MAX_AGE_SECONDS = 300;

/** Repository URL for the "Star on GitHub" badge (override via env). */
export const GITHUB_REPO_URL =
  process.env.NEXT_PUBLIC_GITHUB_REPO_URL ??
  "https://github.com/your-username/GitInsight";

/** Default language color (GitHub muted foreground). */
export const LANGUAGE_COLOR_FALLBACK = "var(--color-language-fallback)";

/** Official GitHub linguist colors — https://github.com/github-linguist/linguist */
export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#663399",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Scala: "#c22d40",
};

export function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] ?? LANGUAGE_COLOR_FALLBACK;
}
