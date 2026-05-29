import type { ConsistencyScoreResult } from "@/lib/consistency-score";

/** Raw GitHub API user resource (subset used by this app). */
export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  starred_url: string;
}

/** Raw GitHub API repository resource (subset used by this app). */
export interface GitHubRepo {
  name: string;
  full_name?: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  updated_at: string;
  topics?: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

/** Raw GitHub API public event resource (subset used by this app). */
export interface GitHubEvent {
  id: string;
  type: string;
  repo: {
    name: string;
  };
  created_at: string;
  payload?: Record<string, unknown>;
}

/** Language byte counts returned by `GET /repos/{owner}/{repo}/languages`. */
export type GitHubLanguages = Record<string, number>;

/** Raw GitHub API starred repository resource (subset used by this app). */
export interface GitHubStarred {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  owner: {
    avatar_url: string;
  };
}

/** Starred repository for dashboard display. */
export type StarredRepo = GitHubStarred;

/** Raw GitHub API user activity (alias for a public event). */
export type GitHubActivity = GitHubEvent;

export type ActivityType = "push" | "pr" | "issue" | "create" | "star" | "fork";

/** Enriched profile returned by `/api/github/user`. */
export interface UserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  blog: string;
  twitter_username: string | null;
  /** From GitHub GraphQL `socialAccounts` (LinkedIn, etc.). */
  social_accounts?: Array<{ provider: string; url: string }>;
}

/** Simplified repository for dashboard display. */
export interface RepoSummary {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  topics: string[];
}

export interface LanguageBreakdown {
  name: string;
  bytes: number;
  percent: number;
  color: string;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  repo: string;
  createdAt: string;
  description: string;
}

export type StreakTimelinePoint = {
  date: string;
  active: boolean;
  streakLength: number;
  inCurrentStreak: boolean;
};

export interface StreakData {
  current: number;
  longest: number;
  totalActiveDays: number;
  lastActive: string;
  /** Daily streak lengths for the last ~90 days (timeline chart). */
  timeline?: StreakTimelinePoint[];
  /** Precomputed on the server from weekly commit frequency. */
  consistencyScore?: ConsistencyScoreResult;
}

export interface WeeklyCommit {
  week: string;
  count: number;
}

export interface CommitFrequency {
  byWeekday: number[];
  byHour: number[];
  byWeek: WeeklyCommit[];
}

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapCell {
  date: string;
  count: number;
  level: HeatmapLevel;
}

/** Push activity row shown in the contribution heatmap day panel. */
export interface HeatmapDayPush {
  id: string;
  repo: string;
  createdAt: string;
  commitCount: number;
  firstCommitMessage: string | null;
  description: string;
}

export type DashboardSection =
  | "profile"
  | "repos"
  | "languages"
  | "activity"
  | "contributions"
  | "streaks"
  | "network"
  | "starred";

export interface DashboardSectionError {
  section: DashboardSection;
  message: string;
  resetAt?: string | null;
}

export interface ReposSection {
  repos: RepoSummary[];
  languagesSummary: Record<string, number>;
  totalFetched: number;
  pages: number;
}

export interface StarredSection {
  repos: GitHubStarred[];
  totalStarredCount: number;
}

export interface ActivitySection {
  items: ActivityItem[];
  groupedByDate: Record<string, ActivityItem[]>;
  commitFrequency: CommitFrequency;
  heatmap: HeatmapCell[][];
  /** Full fetched events for client-side heatmap filtering and day drill-down. */
  events?: GitHubEvent[];
  /** Official GitHub contribution calendar grids keyed by year (GraphQL). */
  officialHeatmapByYear?: Record<number, HeatmapCell[][]>;
  /** Years available in the official contribution calendar. */
  contributionYears?: number[];
  /** Total contributions per calendar year from GitHub. */
  contributionTotalsByYear?: Record<number, number>;
  /** Default github.com profile view — contributions in the last year. */
  rollingYearContributions?: {
    totalContributions: number;
    heatmap: HeatmapCell[][];
  };
}

export interface DashboardCacheMeta {
  /** ISO timestamp for when dashboard data was last refreshed. */
  lastUpdated: string;
  /** True when any section was served stale or exceeded the fresh TTL. */
  isStale: boolean;
}

export interface DashboardData {
  username: string;
  profile: UserProfile | null;
  repos: ReposSection | null;
  languages: LanguageBreakdown[] | null;
  activity: ActivitySection | null;
  streaks: StreakData | null;
  network: NetworkStats | null;
  starred: StarredSection | null;
  errors: DashboardSectionError[];
  cacheMeta?: DashboardCacheMeta;
}

export interface MiniProfile {
  login: string;
  avatarUrl: string;
}

export interface NetworkStats {
  followersCount: number;
  followingCount: number;
  mutualCount: number;
  topFollowers: MiniProfile[];
  topFollowing: MiniProfile[];
}

export interface GitHubRateLimitResource {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface GitHubRateLimitPayload {
  resources: {
    core: GitHubRateLimitResource;
  };
  rate: GitHubRateLimitResource;
}

export interface GitHubRateLimit {
  remaining: number;
  limit: number;
  resetAt: string;
}
