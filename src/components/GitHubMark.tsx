import { GITHUB_MARK_PATH } from "@/lib/github-mark-path";
import { cn } from "@/lib/utils";

type GitHubMarkProps = {
  className?: string;
};

/** Official GitHub mark (Octocat). */
export function GitHubMark({ className }: GitHubMarkProps) {
  return (
    <svg
      className={cn("shrink-0", className)}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d={GITHUB_MARK_PATH} />
    </svg>
  );
}
