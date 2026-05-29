import FolderGit2 from "lucide-react/dist/esm/icons/folder-git-2.mjs";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_GRID_REPOS_CLASS,
} from "@/components/dashboard/metric-card-styles";
import { ChartEmptyState } from "@/components/ui/ChartEmptyState";
import { Shimmer } from "@/components/ui/Shimmer";
import {
  REPO_DESC_WIDTHS,
  REPO_GRID_COUNT,
  REPO_TITLE_WIDTHS,
} from "@/lib/skeleton-dimensions";
import { getLanguageColor } from "@/lib/constants";
import { EMPTY_COPY, formatCount, formatStarCount, formatUpdatedAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RepoSummary } from "@/types/github";

type TopReposProps = {
  repos: RepoSummary[];
};

const repoCardClass = cn(
  DASHBOARD_METRIC_CARD_CLASS,
  "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
);

const repoDescriptionClass =
  "mt-1 min-h-[2.625rem] line-clamp-2 text-sm leading-normal text-gh-gray-5";

function TopReposGhostGrid() {
  return (
    <ul className={DASHBOARD_METRIC_GRID_REPOS_CLASS} aria-hidden>
      {REPO_TITLE_WIDTHS.map((titleWidth, index) => (
        <li key={titleWidth} className="flex min-h-0 w-full">
          <div className={repoCardClass}>
            <Shimmer className="rounded-md" style={{ height: 20, width: titleWidth }} />
            <div className="mt-1 flex min-h-[2.625rem] items-start">
              <Shimmer
                className="rounded-md"
                style={{ height: 20, width: REPO_DESC_WIDTHS[index] ?? "75%" }}
              />
            </div>
            <div className="mt-auto flex gap-3 pt-3">
              <Shimmer className="rounded-md" style={{ height: 16, width: 56 }} />
              <Shimmer className="rounded-md" style={{ height: 16, width: 40 }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RepoGridCard({ repo }: { repo: RepoSummary }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        repoCardClass,
        "text-inherit no-underline transition-[border-color,background-color] duration-gh ease hover:border-gh-gray-2 hover:bg-[var(--color-canvas-subtle)]",
      )}
    >
      <p className="truncate text-sm font-semibold text-gh-gray-7">{repo.name}</p>

      <p className={repoDescriptionClass}>
        {repo.description ?? "\u00a0"}
      </p>

      <p className="mt-auto flex min-h-[1.25rem] min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs leading-snug text-gh-gray-5">
        {repo.language ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getLanguageColor(repo.language) }}
              aria-hidden
            />
            <span className="truncate">{repo.language}</span>
          </span>
        ) : null}
        <span className="gh-stat-number inline-flex shrink-0 items-center gap-1 font-semibold text-gh-gray-7">
          <span aria-hidden>⭐</span>
          {formatStarCount(repo.stargazers_count)}
        </span>
        <span className="gh-stat-number shrink-0 font-semibold text-gh-gray-7">
          {formatCount(repo.forks_count)} {repo.forks_count === 1 ? "fork" : "forks"}
        </span>
        <span className="shrink-0">{formatUpdatedAgo(repo.updated_at)}</span>
      </p>
    </a>
  );
}

export function TopRepos({ repos }: TopReposProps) {
  const topRepos = repos.slice(0, REPO_GRID_COUNT);
  const hasAnyRepo = topRepos.length > 0;

  if (!hasAnyRepo) {
    return (
      <div className="space-y-4">
        <TopReposGhostGrid />
        <ChartEmptyState
          icon={<FolderGit2 strokeWidth={1.5} />}
          message={EMPTY_COPY.topRepos}
        />
      </div>
    );
  }

  return (
    <div className="top-repos w-full min-w-0" data-testid="top-repos-grid">
      <ul className={DASHBOARD_METRIC_GRID_REPOS_CLASS} role="list">
        {topRepos.map((repo) => (
          <li key={repo.html_url} role="listitem" className="flex min-h-0 w-full">
            <RepoGridCard repo={repo} />
          </li>
        ))}
      </ul>
    </div>
  );
}
