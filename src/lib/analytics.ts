import "server-only";

import { cache } from "react";
import { groupActivitiesByDate } from "@/lib/activity-grouping";
import { computeLanguageBreakdown, getPushEventCommitCount } from "@/lib/analytics-client";
import { GITHUB_API_TIMEOUT_MESSAGE, RATE_LIMIT_MESSAGE } from "@/lib/dashboard-errors";
import type {
  CompletenessResult,
  SocialScoreBadge,
} from "@/lib/analytics-types";
import { computeConsistencyScore } from "@/lib/consistency-score";
import { buildStreakTimeline } from "@/lib/streak-timeline";
import { DASHBOARD_FRESH_MAX_AGE_SECONDS } from "@/lib/constants";
import {
  dedupeInFlightRequest,
  getDashboardCacheBatch,
  getRateLimitState,
  type CacheStatus,
  type DashboardCacheSection,
} from "@/lib/cache";
import type {
  ActivityItem,
  ActivitySection,
  ActivityType,
  CommitFrequency,
  DashboardData,
  DashboardCacheMeta,
  DashboardSection,
  DashboardSectionError,
  GitHubEvent,
  GitHubStarred,
  HeatmapCell,
  HeatmapLevel,
  LanguageBreakdown,
  NetworkStats,
  ReposSection,
  RepoSummary,
  StarredSection,
  StreakData,
  UserProfile,
  WeeklyCommit,
} from "@/types/github";

export type { HeatmapCell, HeatmapLevel };

const MS_PER_DAY = 86_400_000;
const STAR_CAP = 5000;
const FORK_CAP = 5000;
const STREAK_WINDOW_DAYS = 365;
const YOY_THIS_YEAR_DAYS = 365;
const YOY_LAST_YEAR_MIN_DAYS = 366;
const YOY_LAST_YEAR_MAX_DAYS = 730;
const YOY_MIN_LAST_YEAR_EVENTS = 50;
const YOY_STABLE_GROWTH_THRESHOLD_PERCENT = 10;
const PRODUCTIVE_REPO_TOP_N = 3;
const PRODUCTIVE_REPO_HOT_STREAK_DAYS = 7;

function toUTCDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getISOWeekLabel(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

function getLast52ISOWeeks(referenceDate = new Date()): WeeklyCommit[] {
  const weeks: WeeklyCommit[] = [];

  for (let i = 51; i >= 0; i -= 1) {
    const weekDate = new Date(referenceDate);
    weekDate.setUTCDate(referenceDate.getUTCDate() - i * 7);
    weeks.push({ week: getISOWeekLabel(weekDate), count: 0 });
  }

  return weeks;
}

function formatPushDescription(repo: string, payload?: Record<string, unknown>): string {
  const n = getPushEventCommitCount(payload);
  const label = n === 1 ? "commit" : "commits";
  return `Pushed ${n} ${label} to ${repo}`;
}

/** Aggregates push commit counts by weekday, hour, and ISO week (last 52 weeks). */
export function buildCommitFrequency(
  events: GitHubEvent[],
  referenceDate = new Date(),
): CommitFrequency {
  const byWeekday = Array<number>(7).fill(0);
  const byHour = Array<number>(24).fill(0);
  const byWeek = getLast52ISOWeeks(referenceDate);
  const weekIndexByLabel = new Map(byWeek.map((entry, index) => [entry.week, index]));

  for (const event of events) {
    if (event.type !== "PushEvent") {
      continue;
    }

    const commitCount = getPushEventCommitCount(event.payload);
    const timestamp = new Date(event.created_at);
    if (Number.isNaN(timestamp.getTime())) {
      continue;
    }

    byWeekday[timestamp.getUTCDay()] += commitCount;
    byHour[timestamp.getUTCHours()] += commitCount;

    const weekIndex = weekIndexByLabel.get(getISOWeekLabel(timestamp));
    if (weekIndex !== undefined) {
      byWeek[weekIndex].count += commitCount;
    }
  }

  return { byWeekday, byHour, byWeek };
}

const EVENT_TYPE_TO_ACTIVITY: Record<string, ActivityType> = {
  PushEvent: "push",
  PullRequestEvent: "pr",
  IssuesEvent: "issue",
  CreateEvent: "create",
  WatchEvent: "star",
  ForkEvent: "fork",
};

function payloadString(payload: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function formatPullRequestDescription(repo: string, payload?: Record<string, unknown>): string {
  const action = payloadString(payload, "action");
  if (action === "opened") {
    return `Opened PR in ${repo}`;
  }
  if (action === "closed") {
    const pullRequest = payload?.pull_request;
    if (
      pullRequest &&
      typeof pullRequest === "object" &&
      "merged" in pullRequest &&
      pullRequest.merged === true
    ) {
      return `Merged PR in ${repo}`;
    }
    return `Closed PR in ${repo}`;
  }
  return `Opened/merged PR in ${repo}`;
}

function formatIssuesDescription(repo: string, payload?: Record<string, unknown>): string {
  const action = payloadString(payload, "action");
  if (action === "opened") {
    return `Opened issue in ${repo}`;
  }
  if (action === "closed") {
    return `Closed issue in ${repo}`;
  }
  return `Opened/closed issue in ${repo}`;
}

function formatCreateDescription(repo: string, payload?: Record<string, unknown>): string {
  const refType = payloadString(payload, "ref_type") ?? "resource";
  const ref = payloadString(payload, "ref");
  const refLabel = ref ? ` ${ref}` : "";
  return `Created ${refType}${refLabel} in ${repo}`;
}

function formatActivityDescription(event: GitHubEvent): string {
  const repo = event.repo.name;

  switch (event.type) {
    case "PushEvent":
      return formatPushDescription(repo, event.payload);
    case "PullRequestEvent":
      return formatPullRequestDescription(repo, event.payload);
    case "IssuesEvent":
      return formatIssuesDescription(repo, event.payload);
    case "CreateEvent":
      return formatCreateDescription(repo, event.payload);
    case "WatchEvent":
      return `Starred ${repo}`;
    case "ForkEvent":
      return `Forked ${repo}`;
    default:
      return `${event.type} in ${repo}`;
  }
}

export function formatActivityItem(event: GitHubEvent): ActivityItem {
  const type = EVENT_TYPE_TO_ACTIVITY[event.type] ?? "push";

  return {
    id: event.id,
    type,
    repo: event.repo.name,
    createdAt: event.created_at,
    description: formatActivityDescription(event),
  };
}

function normalizeCount(count: number, cap: number): number {
  if (cap <= 0) {
    return 0;
  }
  return (Math.min(Math.max(count, 0), cap) / cap) * 100;
}

function daysSince(isoDate: string, referenceDate = new Date()): number {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  const diffMs = referenceDate.getTime() - date.getTime();
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
}

function getRecencyBonus(daysSinceLastPush: number): number {
  if (daysSinceLastPush < 30) {
    return 100;
  }
  if (daysSinceLastPush < 90) {
    return 70;
  }
  if (daysSinceLastPush < 180) {
    return 40;
  }
  return 0;
}

/** Weighted 0–100 score from stars, forks, and push recency (`updated_at`). */
export function scoreRepo(repo: RepoSummary, referenceDate = new Date()): number {
  const stars = normalizeCount(repo.stargazers_count, STAR_CAP);
  const forks = normalizeCount(repo.forks_count, FORK_CAP);
  const recencyBonus = getRecencyBonus(daysSince(repo.updated_at, referenceDate));

  const score = stars * 0.5 + forks * 0.3 + recencyBonus * 0.2;
  return Math.min(100, Math.max(0, score));
}

/** Repos sorted by `scoreRepo` descending (highest first). */
export function rankRepos(repos: RepoSummary[]): RepoSummary[] {
  return repos.slice().sort((a, b) => scoreRepo(b) - scoreRepo(a));
}

const STANDARD_QUANTILE_RANKS = [5, 25, 50, 75, 95] as const;

/**
 * Returns the percentile (0–100) of `value` within `distribution`,
 * using linear interpolation between sorted reference values.
 * Five-element distributions are treated as p5/p25/p50/p75/p95 GitHub population knots.
 */
export function computePercentile(value: number, distribution: number[]): number {
  if (distribution.length === 0) {
    return 0;
  }

  const sorted = [...distribution].sort((a, b) => a - b);
  const n = sorted.length;
  const ranks: number[] =
    n === STANDARD_QUANTILE_RANKS.length
      ? [...STANDARD_QUANTILE_RANKS]
      : sorted.map((_, index) => (index / (n - 1)) * 100);

  const v = Math.max(0, value);

  if (v <= sorted[0]) {
    if (sorted[0] <= 0) {
      return ranks[0];
    }
    return (v / sorted[0]) * ranks[0];
  }

  if (v >= sorted[n - 1]) {
    if (v === sorted[n - 1]) {
      return ranks[n - 1];
    }
    if (sorted[n - 1] <= 0) {
      return 100;
    }
    const extrapolated =
      ranks[n - 1] + ((v - sorted[n - 1]) / sorted[n - 1]) * (100 - ranks[n - 1]);
    return Math.min(100, extrapolated);
  }

  for (let i = 0; i < n - 1; i += 1) {
    if (v <= sorted[i + 1]) {
      const span = sorted[i + 1] - sorted[i];
      if (span <= 0) {
        return ranks[i + 1];
      }
      const t = (v - sorted[i]) / span;
      return ranks[i] + t * (ranks[i + 1] - ranks[i]);
    }
  }

  return 100;
}

/** Approximate GitHub-wide total-stars quantiles (p5–p95) across public accounts. */
const GITHUB_TOTAL_STARS_DISTRIBUTION = [0, 3, 15, 80, 750];

/** Approximate GitHub-wide public-repo count quantiles (p5–p95). */
const GITHUB_PUBLIC_REPOS_DISTRIBUTION = [0, 2, 5, 12, 42];

/** Approximate GitHub-wide follower-count quantiles (p5–p95). */
const GITHUB_FOLLOWERS_DISTRIBUTION = [0, 1, 3, 11, 72];

export interface UserMetricsPercentiles {
  starsPercentile: number;
  reposPercentile: number;
  followersPercentile: number;
}

/** Ranks profile metrics against hardcoded GitHub population reference distributions. */
export function rankUserMetrics(
  profile: UserProfile,
  repos: RepoSummary[],
): UserMetricsPercentiles {
  const totalStars = repos.reduce((sum, repo) => sum + Math.max(0, repo.stargazers_count), 0);

  return {
    starsPercentile: computePercentile(totalStars, GITHUB_TOTAL_STARS_DISTRIBUTION),
    reposPercentile: computePercentile(profile.public_repos, GITHUB_PUBLIC_REPOS_DISTRIBUTION),
    followersPercentile: computePercentile(profile.followers, GITHUB_FOLLOWERS_DISTRIBUTION),
  };
}

export type {
  CompletenessResult,
  SocialScoreBadge,
} from "@/lib/analytics-types";
export type {
  ConsistencyGrade,
  ConsistencyScoreResult,
} from "@/lib/consistency-score";
export { computeConsistencyScore, getConsistencyGrade } from "@/lib/consistency-score";

const DIVERSITY_LANGUAGE_POINTS_EACH = 8;
const DIVERSITY_LANGUAGE_POINTS_MAX = 40;
const DIVERSITY_TOPIC_POINTS_EACH = 4;
const DIVERSITY_TOPIC_POINTS_MAX = 20;
const DIVERSITY_DOCUMENTATION_POINTS = 10;
const DIVERSITY_LONG_RUNNING_POINTS = 15;
const DIVERSITY_NOT_MONO_FOCUSED_POINTS = 15;
const DIVERSITY_MONO_FOCUS_THRESHOLD = 0.8;
const MS_PER_YEAR = MS_PER_DAY * 365;

export interface DiversityReport {
  languageCount: number;
  topicCount: number;
  hasDocumentation: boolean;
  hasLongRunningProjects: boolean;
  isMonoFocused: boolean;
  score: number;
  summary: string;
}

function isRepoOlderThanOneYear(createdAt: string, referenceDate = new Date()): boolean {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return false;
  }

  return referenceDate.getTime() - created.getTime() >= MS_PER_YEAR;
}

function buildDiversitySummary(
  metrics: Omit<DiversityReport, "summary" | "score">,
  repoCount: number,
): string {
  if (repoCount === 0) {
    return (
      "No public repositories are available to analyze. " +
      "Publish repos with varied languages, topics, and descriptions to build a diversity profile."
    );
  }

  const varietyLabel =
    metrics.languageCount >= 4
      ? "broad"
      : metrics.languageCount >= 2
        ? "moderate"
        : "narrow";

  const firstSentence = metrics.isMonoFocused
    ? `Your ${repoCount} public ${repoCount === 1 ? "repository" : "repositories"} lean heavily toward one primary language, giving the portfolio a focused specialty.`
    : `Across ${repoCount} public ${repoCount === 1 ? "repository" : "repositories"}, you show ${varietyLabel} variety with ${metrics.languageCount} languages and ${metrics.topicCount} distinct topics.`;

  let secondSentence: string;
  if (metrics.hasDocumentation && metrics.hasLongRunningProjects && !metrics.isMonoFocused) {
    secondSentence =
      "Documented repos and long-running projects reinforce a mature, well-rounded open-source footprint.";
  } else if (!metrics.hasDocumentation && !metrics.hasLongRunningProjects) {
    secondSentence =
      "Adding README-style descriptions and sustaining older projects would strengthen depth and discoverability.";
  } else if (!metrics.hasDocumentation) {
    secondSentence =
      "Several repos lack descriptions—adding them would make the portfolio easier to explore.";
  } else if (!metrics.hasLongRunningProjects) {
    secondSentence =
      "Most projects appear relatively new; maintaining repos beyond a year would signal long-term commitment.";
  } else if (metrics.isMonoFocused) {
    secondSentence =
      "Branching into additional languages or topic areas would raise your diversity score further.";
  } else {
    secondSentence =
      "You already mix languages and topics well—keep documenting and evolving long-lived repos to stay balanced.";
  }

  return `${firstSentence} ${secondSentence}`;
}

function isPortfolioMonoFocused(repos: RepoSummary[]): boolean {
  if (repos.length === 0) {
    return false;
  }

  const languageCounts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language) {
      continue;
    }
    languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
  }

  const topLanguageCount =
    languageCounts.size > 0 ? Math.max(...languageCounts.values()) : 0;
  return topLanguageCount / repos.length > DIVERSITY_MONO_FOCUS_THRESHOLD;
}

/** Scores repository portfolio diversity (0–100) with a short narrative summary. */
export function repoDiversityScore(repos: RepoSummary[]): DiversityReport {
  const languageCount = new Set(
    repos.map((repo) => repo.language).filter((language): language is string => Boolean(language)),
  ).size;

  const topicCount = new Set(
    repos.flatMap((repo) => repo.topics).filter((topic) => topic.trim().length > 0),
  ).size;

  const hasDocumentation = repos.some(
    (repo) => typeof repo.description === "string" && repo.description.trim().length > 0,
  );

  const hasLongRunningProjects = repos.some((repo) => isRepoOlderThanOneYear(repo.created_at));
  const isMonoFocused = isPortfolioMonoFocused(repos);

  const languagePoints = Math.min(
    languageCount * DIVERSITY_LANGUAGE_POINTS_EACH,
    DIVERSITY_LANGUAGE_POINTS_MAX,
  );
  const topicPoints = Math.min(
    topicCount * DIVERSITY_TOPIC_POINTS_EACH,
    DIVERSITY_TOPIC_POINTS_MAX,
  );
  const documentationPoints = hasDocumentation ? DIVERSITY_DOCUMENTATION_POINTS : 0;
  const longRunningPoints = hasLongRunningProjects ? DIVERSITY_LONG_RUNNING_POINTS : 0;
  const focusPoints = isMonoFocused ? 0 : DIVERSITY_NOT_MONO_FOCUSED_POINTS;

  const score = Math.min(
    100,
    languagePoints + topicPoints + documentationPoints + longRunningPoints + focusPoints,
  );

  const metrics = {
    languageCount,
    topicCount,
    hasDocumentation,
    hasLongRunningProjects,
    isMonoFocused,
  };

  return {
    ...metrics,
    score,
    summary: buildDiversitySummary(metrics, repos.length),
  };
}

const SOCIAL_FOLLOWERS_CAP = 10_000;
const SOCIAL_STARS_CAP = 50_000;
const SOCIAL_FORKS_CAP = 5_000;
const SOCIAL_FOLLOWERS_WEIGHT = 30;
const SOCIAL_STARS_WEIGHT = 40;
const SOCIAL_FORKS_WEIGHT = 20;
const SOCIAL_MONO_FOCUS_PENALTY = 5;

export interface SocialScore {
  score: number;
  badge: SocialScoreBadge;
}

interface ProfileCompletenessCriterion {
  field: string;
  points: number;
  isComplete: (profile: UserProfile) => boolean;
  tip: string;
}

const PROFILE_COMPLETENESS_CRITERIA: ProfileCompletenessCriterion[] = [
  {
    field: "name",
    points: 15,
    isComplete: (profile) => Boolean(profile.name?.trim()),
    tip: "Add your display name so others recognize you on GitHub.",
  },
  {
    field: "bio",
    points: 20,
    isComplete: (profile) => Boolean(profile.bio?.trim()),
    tip: "Write a short bio describing what you build or care about.",
  },
  {
    field: "avatar",
    points: 10,
    isComplete: (profile) => hasNonDefaultAvatar(profile.avatar_url),
    tip: "Upload a custom profile photo instead of the auto-generated identicon.",
  },
  {
    field: "location",
    points: 10,
    isComplete: (profile) => Boolean(profile.location?.trim()),
    tip: "Add your location to help collaborators find peers in your timezone.",
  },
  {
    field: "website",
    points: 15,
    isComplete: (profile) => Boolean(profile.blog?.trim()),
    tip: "Link your portfolio, blog, or project site in the website field.",
  },
  {
    field: "company",
    points: 10,
    isComplete: (profile) => Boolean(profile.company?.trim()),
    tip: "List your company or organization to add professional context.",
  },
  {
    field: "twitter_username",
    points: 10,
    isComplete: (profile) => Boolean(profile.twitter_username?.trim()),
    tip: "Connect an X (Twitter) username if you share updates there.",
  },
  {
    field: "public_repos",
    points: 10,
    isComplete: (profile) => profile.public_repos >= 5,
    tip: "Publish at least five public repositories to showcase your work.",
  },
];

function hasNonDefaultAvatar(avatarUrl: string): boolean {
  const url = avatarUrl.trim();
  if (!url.startsWith("http")) {
    return false;
  }

  const lower = url.toLowerCase();
  if (lower.includes("identicon")) {
    return false;
  }

  if (/gravatar\.com/i.test(lower)) {
    return false;
  }

  if (lower.includes("github.githubassets.com/images/gravatars")) {
    return false;
  }

  return true;
}

/** Scores how complete a public GitHub profile is (0–100) with missing fields and tips. */
export function profileCompletenessScore(profile: UserProfile): CompletenessResult {
  let score = 0;
  const missing: string[] = [];
  const tips: string[] = [];

  for (const criterion of PROFILE_COMPLETENESS_CRITERIA) {
    if (criterion.isComplete(profile)) {
      score += criterion.points;
      continue;
    }

    missing.push(criterion.field);
    tips.push(criterion.tip);
  }

  return {
    score: Math.min(100, score),
    missing,
    tips,
  };
}

function logScaledSocialComponent(value: number, cap: number, weight: number): number {
  return (Math.log10(Math.max(value, 1)) / Math.log10(cap)) * weight;
}

function getSocialScoreBadge(score: number): SocialScoreBadge {
  if (score < 30) {
    return "Rising Star";
  }
  if (score < 50) {
    return "Contributor";
  }
  if (score < 75) {
    return "Influencer";
  }
  return "Legend";
}

/**
 * Weighted social influence score (0–100) from followers, total stars, total forks,
 * and a mono-language portfolio penalty.
 */
export function computeSocialScore(profile: UserProfile, repos: RepoSummary[]): SocialScore {
  const totalStars = repos.reduce((sum, repo) => sum + Math.max(0, repo.stargazers_count), 0);
  const totalForks = repos.reduce((sum, repo) => sum + Math.max(0, repo.forks_count), 0);

  const followersScore = logScaledSocialComponent(
    profile.followers,
    SOCIAL_FOLLOWERS_CAP,
    SOCIAL_FOLLOWERS_WEIGHT,
  );
  const starsScore = logScaledSocialComponent(totalStars, SOCIAL_STARS_CAP, SOCIAL_STARS_WEIGHT);
  const forksScore = logScaledSocialComponent(totalForks, SOCIAL_FORKS_CAP, SOCIAL_FORKS_WEIGHT);
  const diversityPenalty = isPortfolioMonoFocused(repos) ? -SOCIAL_MONO_FOCUS_PENALTY : 0;

  const score = Math.min(
    100,
    Math.round(followersScore + starsScore + forksScore + diversityPenalty),
  );

  return {
    score,
    badge: getSocialScoreBadge(score),
  };
}

const HOURS_PER_DAY = 24;
const PEAK_ACTIVITY_WINDOW_HOURS = 4;

export type PeakActivityPeriod = "morning" | "afternoon" | "evening" | "night";

export interface PeakPeriod {
  peakHour: number;
  peakHourLabel: string;
  period: PeakActivityPeriod;
  sessionWindow: string;
  description: string;
}

function normalizeHourData(hourData: number[]): number[] {
  const normalized = Array<number>(HOURS_PER_DAY).fill(0);

  for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
    const value = hourData[hour];
    normalized[hour] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  return normalized;
}

function sumHourWindow(hourData: number[], start: number, length: number): number {
  let total = 0;

  for (let offset = 0; offset < length; offset += 1) {
    total += hourData[(start + offset) % HOURS_PER_DAY];
  }

  return total;
}

function formatPeakHourLabel(hour: number): string {
  const normalized = ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12}:00 ${suffix}`;
}

function formatSessionHourShort(hour: number): string {
  const normalized = ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  const suffix = normalized >= 12 ? "pm" : "am";
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12}${suffix}`;
}

function formatSessionWindow(windowStart: number): string {
  const start = ((windowStart % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  const end = (start + PEAK_ACTIVITY_WINDOW_HOURS) % HOURS_PER_DAY;
  return `${formatSessionHourShort(start)}–${formatSessionHourShort(end)}`;
}

function classifyPeakPeriod(hour: number): PeakActivityPeriod {
  const normalized = ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;

  if (normalized >= 5 && normalized < 12) {
    return "morning";
  }
  if (normalized >= 12 && normalized < 17) {
    return "afternoon";
  }
  if (normalized >= 17 && normalized < 21) {
    return "evening";
  }
  return "night";
}

function peakPeriodDescription(period: PeakActivityPeriod): string {
  const label = period.charAt(0).toUpperCase() + period.slice(1);
  return `${label} coder`;
}

/** Finds the busiest 4-hour UTC window in hourly commit counts. */
export function detectPeakActivityPeriod(hourData: number[]): PeakPeriod {
  const hours = normalizeHourData(hourData);

  let windowStart = 0;
  let bestTotal = -1;

  for (let start = 0; start < HOURS_PER_DAY; start += 1) {
    const total = sumHourWindow(hours, start, PEAK_ACTIVITY_WINDOW_HOURS);
    if (total > bestTotal) {
      bestTotal = total;
      windowStart = start;
    }
  }

  const peakHour =
    Math.round(windowStart + (PEAK_ACTIVITY_WINDOW_HOURS - 1) / 2) % HOURS_PER_DAY;
  const period = classifyPeakPeriod(peakHour);

  return {
    peakHour,
    peakHourLabel: formatPeakHourLabel(peakHour),
    period,
    sessionWindow: formatSessionWindow(windowStart),
    description: peakPeriodDescription(period),
  };
}

function extractPushActiveDates(events: GitHubEvent[]): Set<string> {
  const dates = new Set<string>();

  for (const event of events) {
    if (event.type !== "PushEvent") {
      continue;
    }

    const eventDate = new Date(event.created_at);
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    dates.add(toUTCDateKey(eventDate));
  }

  return dates;
}

function getStreakWindow(referenceDate: Date): { start: Date; end: Date; startKey: string; endKey: string } {
  const end = startOfUTCDay(referenceDate);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (STREAK_WINDOW_DAYS - 1));

  return {
    start,
    end,
    startKey: toUTCDateKey(start),
    endKey: toUTCDateKey(end),
  };
}

function filterDatesInWindow(dates: Set<string>, startKey: string, endKey: string): Set<string> {
  const filtered = new Set<string>();
  for (const dayKey of dates) {
    if (dayKey >= startKey && dayKey <= endKey) {
      filtered.add(dayKey);
    }
  }
  return filtered;
}

/**
 * Counts consecutive active days backward from today.
 * If today is inactive but yesterday is active, the streak still counts from yesterday.
 */
function calculateCurrentStreak(activeDays: Set<string>, referenceDate: Date): number {
  const today = startOfUTCDay(referenceDate);
  const todayKey = toUTCDateKey(today);

  let cursor = new Date(today);
  if (!activeDays.has(todayKey)) {
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    if (!activeDays.has(toUTCDateKey(yesterday))) {
      return 0;
    }
    cursor = yesterday;
  }

  let streak = 0;
  while (activeDays.has(toUTCDateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function calculateLongestStreak(activeDays: Set<string>, windowStart: Date, windowEnd: Date): number {
  let longest = 0;
  let running = 0;
  const cursor = new Date(windowStart);

  while (cursor <= windowEnd) {
    if (activeDays.has(toUTCDateKey(cursor))) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return longest;
}

export interface GrowthData {
  commitsThisYear: number;
  commitsLastYear: number;
  growthPercent: number;
  trend: "up" | "down" | "stable";
  peakMonthThisYear: string;
  peakMonthLastYear: string;
}

function toUTCMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function countPushCommits(events: GitHubEvent[]): number {
  let total = 0;

  for (const event of events) {
    if (event.type !== "PushEvent") {
      continue;
    }

    total += getPushEventCommitCount(event.payload);
  }

  return total;
}

function findPeakCommitMonth(events: GitHubEvent[]): string {
  const commitsByMonth = new Map<string, number>();

  for (const event of events) {
    if (event.type !== "PushEvent") {
      continue;
    }

    const eventDate = new Date(event.created_at);
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    const monthKey = toUTCMonthKey(eventDate);
    const commitCount = getPushEventCommitCount(event.payload);
    commitsByMonth.set(monthKey, (commitsByMonth.get(monthKey) ?? 0) + commitCount);
  }

  let peakMonth = "";
  let peakCount = -1;

  for (const [month, count] of commitsByMonth) {
    if (count > peakCount) {
      peakCount = count;
      peakMonth = month;
    }
  }

  return peakMonth;
}

function classifyGrowthTrend(growthPercent: number): GrowthData["trend"] {
  if (growthPercent > YOY_STABLE_GROWTH_THRESHOLD_PERCENT) {
    return "up";
  }
  if (growthPercent < -YOY_STABLE_GROWTH_THRESHOLD_PERCENT) {
    return "down";
  }
  return "stable";
}

/**
 * Compares push commit volume in the last 365 days vs. the prior year (days 366–730 ago).
 * Returns null when fewer than 50 events fall in the prior-year window.
 */
export function computeYoYGrowth(
  events: GitHubEvent[],
  referenceDate = new Date(),
): GrowthData | null {
  const thisYearEvents: GitHubEvent[] = [];
  const lastYearEvents: GitHubEvent[] = [];

  for (const event of events) {
    const eventDate = new Date(event.created_at);
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    const daysAgo = daysSince(event.created_at, referenceDate);

    if (daysAgo < YOY_THIS_YEAR_DAYS) {
      thisYearEvents.push(event);
    } else if (daysAgo >= YOY_LAST_YEAR_MIN_DAYS && daysAgo <= YOY_LAST_YEAR_MAX_DAYS) {
      lastYearEvents.push(event);
    }
  }

  if (lastYearEvents.length < YOY_MIN_LAST_YEAR_EVENTS) {
    return null;
  }

  const commitsThisYear = countPushCommits(thisYearEvents);
  const commitsLastYear = countPushCommits(lastYearEvents);

  const growthPercent =
    commitsLastYear === 0
      ? commitsThisYear > 0
        ? 100
        : 0
      : ((commitsThisYear - commitsLastYear) / commitsLastYear) * 100;

  return {
    commitsThisYear,
    commitsLastYear,
    growthPercent,
    trend: classifyGrowthTrend(growthPercent),
    peakMonthThisYear: findPeakCommitMonth(thisYearEvents),
    peakMonthLastYear: findPeakCommitMonth(lastYearEvents),
  };
}

export interface ProductiveRepoEntry {
  name: string;
  commitCount: number;
  stars: number;
  language: string | null;
  lastPushedAt: string;
  hotStreak: boolean;
}

export interface ProductiveRepoStats {
  repos: ProductiveRepoEntry[];
}

function repoShortNameFromEvent(eventRepoName: string): string {
  const slashIndex = eventRepoName.lastIndexOf("/");
  return slashIndex >= 0 ? eventRepoName.slice(slashIndex + 1) : eventRepoName;
}

interface PushEventRepoAggregate {
  commitCount: number;
  lastPushedAt: string;
}

function aggregatePushEventsByRepo(events: GitHubEvent[]): Map<string, PushEventRepoAggregate> {
  const byRepo = new Map<string, PushEventRepoAggregate>();

  for (const event of events) {
    if (event.type !== "PushEvent") {
      continue;
    }

    const eventDate = new Date(event.created_at);
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    const repoName = repoShortNameFromEvent(event.repo.name);
    const existing = byRepo.get(repoName);

    if (!existing) {
      byRepo.set(repoName, { commitCount: 1, lastPushedAt: event.created_at });
      continue;
    }

    existing.commitCount += 1;
    if (eventDate.getTime() > new Date(existing.lastPushedAt).getTime()) {
      existing.lastPushedAt = event.created_at;
    }
  }

  return byRepo;
}

/**
 * Ranks repositories by PushEvent frequency (not stars) and returns the top three
 * joined with `RepoSummary` metadata from the user's public repos.
 */
export function findMostProductiveRepo(
  repos: RepoSummary[],
  events: GitHubEvent[],
  referenceDate = new Date(),
): ProductiveRepoStats {
  const reposByName = new Map(repos.map((repo) => [repo.name, repo]));
  const pushByRepo = aggregatePushEventsByRepo(events);

  const ranked = [...pushByRepo.entries()].sort(
    (a, b) => b[1].commitCount - a[1].commitCount,
  );

  const topRepos: ProductiveRepoEntry[] = [];

  for (const [repoName, stats] of ranked) {
    const repo = reposByName.get(repoName);
    if (!repo) {
      continue;
    }

    topRepos.push({
      name: repo.name,
      commitCount: stats.commitCount,
      stars: repo.stargazers_count,
      language: repo.language,
      lastPushedAt: stats.lastPushedAt,
      hotStreak: daysSince(stats.lastPushedAt, referenceDate) < PRODUCTIVE_REPO_HOT_STREAK_DAYS,
    });

    if (topRepos.length >= PRODUCTIVE_REPO_TOP_N) {
      break;
    }
  }

  return { repos: topRepos };
}

const COMMIT_MESSAGE_GOOD_MAX_LENGTH = 72;
const COMMIT_MESSAGE_SHORT_MAX_LENGTH = 10;
const COMMIT_MESSAGE_MEDIUM_MAX_LENGTH = 19;
const COMMIT_QUALITY_GOOD_EXAMPLE_MIN_SCORE = 7;
const COMMIT_QUALITY_WORST_COUNT = 3;
const COMMIT_QUALITY_GOOD_EXAMPLE_COUNT = 3;

const GENERIC_COMMIT_MESSAGES = new Set(["update", "fix", "wip", "test"]);

const IMPERATIVE_VERB_PATTERN =
  /^(Add|Fix|Update|Remove|Refactor|Implement|Improve|Move|Rename|Delete|Create|Merge|Bump|Docs|Style|Test|Chore|Feat|Build|Ci|Revert)\b/;

const TICKET_REFERENCE_PATTERN = /\[(?:#\d+|[A-Z][A-Z0-9]*-\d+)\]/;

export type CommitQualityGrade = "S" | "A" | "B" | "C" | "D";

export interface CommitQualityReport {
  averageScore: number;
  grade: CommitQualityGrade;
  worstMessages: string[];
  exampleGoodMessages: string[];
}

interface ScoredCommitMessage {
  message: string;
  score: number;
}

function getCommitSubject(message: string): string {
  return message.split("\n")[0]?.trim() ?? message.trim();
}

function extractCommitMessages(events: GitHubEvent[]): string[] {
  const messages: string[] = [];

  for (const event of events) {
    if (event.type !== "PushEvent") {
      continue;
    }

    const commits = event.payload?.commits;
    if (!Array.isArray(commits)) {
      continue;
    }

    for (const commit of commits) {
      if (!commit || typeof commit !== "object") {
        continue;
      }

      const rawMessage = (commit as { message?: unknown }).message;
      if (typeof rawMessage !== "string") {
        continue;
      }

      const trimmed = rawMessage.trim();
      if (trimmed.length > 0) {
        messages.push(trimmed);
      }
    }
  }

  return messages;
}

function scoreCommitMessage(message: string): number {
  const subject = getCommitSubject(message);
  const length = subject.length;

  let score: number;
  if (length < COMMIT_MESSAGE_SHORT_MAX_LENGTH) {
    score = 3;
  } else if (length <= COMMIT_MESSAGE_MEDIUM_MAX_LENGTH) {
    score = 5;
  } else if (length <= COMMIT_MESSAGE_GOOD_MAX_LENGTH) {
    score = 7;
  } else {
    score = 5;
  }

  if (IMPERATIVE_VERB_PATTERN.test(subject)) {
    score += 1;
  }

  if (TICKET_REFERENCE_PATTERN.test(subject)) {
    score += 1;
  }

  const hasLetters = /[a-zA-Z]/.test(subject);
  if (
    hasLetters &&
    (subject === subject.toLowerCase() || (subject.length > 2 && subject === subject.toUpperCase()))
  ) {
    score -= 1;
  }

  if (GENERIC_COMMIT_MESSAGES.has(subject.toLowerCase())) {
    score -= 1;
  }

  return Math.min(10, Math.max(0, score));
}

export function getCommitQualityGrade(averageScore: number): CommitQualityGrade {
  if (averageScore >= 9) {
    return "S";
  }
  if (averageScore >= 7.5) {
    return "A";
  }
  if (averageScore >= 6) {
    return "B";
  }
  if (averageScore >= 4.5) {
    return "C";
  }
  return "D";
}

/** Scores commit message quality from PushEvent payloads (0–10 average with examples). */
export function analyzeCommitMessages(events: GitHubEvent[]): CommitQualityReport {
  const scored = extractCommitMessages(events).map((message) => ({
    message: getCommitSubject(message),
    score: scoreCommitMessage(message),
  }));

  if (scored.length === 0) {
    return {
      averageScore: 0,
      grade: "D",
      worstMessages: [],
      exampleGoodMessages: [],
    };
  }

  const averageScore =
    Math.round((scored.reduce((sum, entry) => sum + entry.score, 0) / scored.length) * 10) / 10;

  const byScoreAsc = [...scored].sort((a, b) => a.score - b.score || a.message.localeCompare(b.message));
  const byScoreDesc = [...scored].sort((a, b) => b.score - a.score || a.message.localeCompare(b.message));

  const worstMessages = pickUniqueMessages(
    byScoreAsc,
    COMMIT_QUALITY_WORST_COUNT,
  );

  const goodCandidates = byScoreDesc.filter(
    (entry) => entry.score >= COMMIT_QUALITY_GOOD_EXAMPLE_MIN_SCORE,
  );
  const exampleGoodMessages = pickUniqueMessages(
    goodCandidates.length > 0 ? goodCandidates : byScoreDesc,
    COMMIT_QUALITY_GOOD_EXAMPLE_COUNT,
  );

  return {
    averageScore,
    grade: getCommitQualityGrade(averageScore),
    worstMessages,
    exampleGoodMessages,
  };
}

function pickUniqueMessages(
  entries: ScoredCommitMessage[],
  limit: number,
): string[] {
  const picked: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.message)) {
      continue;
    }

    seen.add(entry.message);
    picked.push(entry.message);

    if (picked.length >= limit) {
      break;
    }
  }

  return picked;
}

export type CollabStyleType = "lone-wolf" | "collaborator" | "maintainer" | "explorer";

export interface CollabStyleMetrics {
  prCount: number;
  issueCount: number;
  directPushCount: number;
  forkCount: number;
}

export interface CollabStyle {
  style: CollabStyleType;
  description: string;
  metrics: CollabStyleMetrics;
}

interface CollabEventCounts {
  prCount: number;
  issueCount: number;
  pushCount: number;
  forkCount: number;
  directPushCount: number;
}

function countCollaborationEvents(events: GitHubEvent[]): CollabEventCounts {
  let prCount = 0;
  let issueCount = 0;
  let pushCount = 0;
  let forkCount = 0;

  for (const event of events) {
    switch (event.type) {
      case "PullRequestEvent":
        prCount += 1;
        break;
      case "IssuesEvent":
        issueCount += 1;
        break;
      case "PushEvent":
        pushCount += 1;
        break;
      case "ForkEvent":
        forkCount += 1;
        break;
      default:
        break;
    }
  }

  const directPushCount = Math.max(0, pushCount - Math.min(pushCount, prCount));

  return { prCount, issueCount, pushCount, forkCount, directPushCount };
}

function classifyCollaborationStyle(counts: CollabEventCounts): CollabStyleType {
  const { prCount, issueCount, directPushCount, forkCount, pushCount } = counts;
  const total = prCount + issueCount + directPushCount + forkCount;

  if (total === 0) {
    return "lone-wolf";
  }

  const directPushRatio = pushCount > 0 ? directPushCount / pushCount : 0;
  const collabCount = prCount + issueCount;

  const isExplorer =
    forkCount > 0 &&
    (forkCount >= prCount || forkCount >= issueCount) &&
    forkCount / total >= 0.15;

  const isMaintainer =
    (prCount >= 2 && issueCount >= 1) ||
    (prCount >= 1 && issueCount >= 2) ||
    prCount >= 3;

  const isCollaborator = prCount >= 1 || issueCount >= 2;

  const isLoneWolf =
    directPushCount >= collabCount &&
    (directPushRatio >= 0.6 || (prCount === 0 && issueCount === 0 && directPushCount > 0));

  if (isExplorer && forkCount >= collabCount) {
    return "explorer";
  }

  if (isMaintainer) {
    return "maintainer";
  }

  if (isCollaborator && !isLoneWolf) {
    return "collaborator";
  }

  if (isLoneWolf || isExplorer) {
    return isExplorer ? "explorer" : "lone-wolf";
  }

  return "collaborator";
}

function buildCollabStyleDescription(style: CollabStyleType, metrics: CollabStyleMetrics): string {
  const { prCount, issueCount, directPushCount, forkCount } = metrics;

  switch (style) {
    case "maintainer":
      return (
        `Your activity is PR- and issue-heavy (${prCount} pull requests, ${issueCount} issue events), ` +
        "which points to someone who shepherds work through review and triage rather than pushing straight to default branches. " +
        "You likely coordinate changes, respond to reports, and keep repositories healthy for other contributors."
      );
    case "collaborator":
      return (
        `You mix direct pushes with review-oriented signals (${prCount} PRs, ${issueCount} issue events), ` +
        "suggesting you participate in shared workflows without being purely process-driven. " +
        "That balance fits someone who ships code while still engaging with teammates through GitHub's collaboration tools."
      );
    case "explorer":
      return (
        `Fork activity stands out (${forkCount} fork events) alongside ${directPushCount} direct pushes and ${prCount} PRs, ` +
        "which often means you sample other people's projects before contributing back. " +
        "You appear curious about the wider ecosystem and willing to branch off upstream work to experiment or learn."
      );
    case "lone-wolf":
    default:
      return (
        `Most of your visible work is direct pushing (${directPushCount} push events vs. ${prCount} PRs and ${issueCount} issue events), ` +
        "so you tend to land commits without leaning on pull-request or issue workflows in public activity. " +
        "That pattern fits solo builders, personal repos, or teams where you push straight to shared branches."
      );
  }
}

/** Infers collaboration style from public GitHub event type mix. */
export function detectCollaborationStyle(events: GitHubEvent[]): CollabStyle {
  const counts = countCollaborationEvents(events);
  const metrics: CollabStyleMetrics = {
    prCount: counts.prCount,
    issueCount: counts.issueCount,
    directPushCount: counts.directPushCount,
    forkCount: counts.forkCount,
  };

  const style = classifyCollaborationStyle(counts);

  return {
    style,
    description: buildCollabStyleDescription(style, metrics),
    metrics,
  };
}

/** Derives contribution streak metrics from active UTC date keys. */
export function calculateStreaksFromActiveDays(
  activeDays: Set<string>,
  referenceDate = new Date(),
): StreakData {
  const { start, end, startKey, endKey } = getStreakWindow(referenceDate);
  const activeDaysInWindow = filterDatesInWindow(activeDays, startKey, endKey);
  const sortedDescending = [...activeDays].sort().reverse();

  return {
    current: calculateCurrentStreak(activeDays, referenceDate),
    longest: calculateLongestStreak(activeDaysInWindow, start, end),
    totalActiveDays: activeDaysInWindow.size,
    lastActive: sortedDescending[0] ?? "",
    timeline: buildStreakTimeline(activeDays, referenceDate),
  };
}

/** Derives push streak metrics from public GitHub events. */
export function calculateStreaks(events: GitHubEvent[], referenceDate = new Date()): StreakData {
  return calculateStreaksFromActiveDays(extractPushActiveDates(events), referenceDate);
}

const DASHBOARD_ACTIVITY_EVENT_TYPES = new Set([
  "PushEvent",
  "PullRequestEvent",
  "IssuesEvent",
  "CreateEvent",
  "WatchEvent",
  "ForkEvent",
]);

const GITHUB_API_ROUTES = [
  { section: "profile", path: "user" },
  { section: "repos", path: "repos" },
  { section: "languages", path: "languages" },
  { section: "activity", path: "events" },
  { section: "contributions", path: "contributions" },
  { section: "streaks", path: "streaks" },
  { section: "network", path: "network" },
  { section: "starred", path: "stars" },
] as const satisfies ReadonlyArray<{ section: DashboardSection; path: string }>;

type GithubApiRoute = (typeof GITHUB_API_ROUTES)[number];
type GithubApiSection = GithubApiRoute["section"];

interface FetchSectionResult<T> {
  section: GithubApiSection;
  data: T | null;
  error: string | null;
  resetAt?: string | null;
  cacheStatus?: CacheStatus;
  /** Response `Age` header in seconds, when present. */
  ageSeconds?: number;
  /** Response `Date` header, when present. */
  responseDate?: string;
}

interface UserApiResponse extends UserProfile {}

interface ReposApiResponse {
  repos: RepoSummary[];
  languages_summary: Record<string, number>;
  total_fetched: number;
  pages: number;
}

interface LanguagesApiResponse {
  languages: Array<{ language: string; bytes: number; percentage: number }>;
}

interface EventsApiResponse {
  events: GitHubEvent[];
}

interface ContributionsApiResponse {
  years: number[];
  totalsByYear: Record<number, number>;
  heatmapByYear: Record<number, HeatmapCell[][]>;
  rollingYear: {
    totalContributions: number;
    heatmap: HeatmapCell[][];
  };
  activeDates: string[];
  source: "github_graphql";
}

interface StreaksApiResponse {
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  last_active_date: string | null;
  timeline?: Array<{
    date: string;
    active: boolean;
    streak_length: number;
    in_current_streak: boolean;
  }>;
}

interface NetworkApiResponse {
  followers_count: number;
  following_count: number;
  mutual_count: number;
  top_followers: Array<{ login: string; avatar_url: string }>;
  top_following: Array<{ login: string; avatar_url: string }>;
}

interface StarsApiResponse {
  repos: GitHubStarred[];
  total_starred_count: number;
}

function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

function logFetchTiming(section: string, durationMs: number, status: number): void {
  if (!isDevelopment()) {
    return;
  }

  console.log(`[fetchDashboardSection] ${section}: ${durationMs.toFixed(0)}ms (${status})`);
}

const GITHUB_SECTION_CACHE_KEY: Record<GithubApiSection, DashboardCacheSection> = {
  profile: "profile",
  repos: "repos",
  languages: "languages",
  activity: "activity",
  contributions: "contributions",
  streaks: "streaks",
  network: "network",
  starred: "starred",
};

const getDashboardCacheBatchCached = cache(getDashboardCacheBatch);
const getRateLimitStateCached = cache(getRateLimitState);

function isGithubRateLimitErrorMessage(message: string | null | undefined): boolean {
  if (!message) {
    return false;
  }

  return (
    message === RATE_LIMIT_MESSAGE ||
    message.startsWith(`${RATE_LIMIT_MESSAGE}::`) ||
    /rate limit exceeded/i.test(message)
  );
}

function buildRateLimitSectionResult<T>(
  section: GithubApiSection,
  resetAt?: string | null,
): FetchSectionResult<T> {
  return {
    section,
    data: null,
    error: RATE_LIMIT_MESSAGE,
    resetAt: resetAt ?? null,
  };
}

async function fetchGithubSectionHttp<T>(
  section: GithubApiSection,
  path: string,
  username: string,
): Promise<FetchSectionResult<T>> {
  const startedAt = performance.now();
  const url = `${getAppBaseUrl()}/api/github/${path}?username=${encodeURIComponent(username)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const durationMs = performance.now() - startedAt;
    logFetchTiming(section, durationMs, response.status);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        resetAt?: string | null;
        retryAfter?: number;
      } | null;

      if (response.status === 504) {
        return {
          section,
          data: null,
          error: GITHUB_API_TIMEOUT_MESSAGE,
          resetAt: null,
        };
      }

      const message = body?.error ?? `${response.status} ${response.statusText}`;
      return {
        section,
        data: null,
        error: message,
        resetAt: body?.resetAt ?? null,
      };
    }

    const data = (await response.json()) as T;
    const cacheHeader = response.headers.get("X-Cache");
    const cacheStatus =
      cacheHeader === "HIT" || cacheHeader === "STALE" || cacheHeader === "MISS"
        ? cacheHeader
        : undefined;
    const ageHeader = response.headers.get("Age");
    const parsedAge = ageHeader ? Number.parseInt(ageHeader, 10) : Number.NaN;
    const ageSeconds = Number.isFinite(parsedAge) ? parsedAge : undefined;
    const responseDate = response.headers.get("Date") ?? undefined;

    return {
      section,
      data,
      error: null,
      cacheStatus,
      ageSeconds,
      responseDate,
    };
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    logFetchTiming(section, durationMs, 0);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { section, data: null, error: message };
  }
}

async function resolveGithubSection<T>(
  section: GithubApiSection,
  path: string,
  username: string,
): Promise<FetchSectionResult<T>> {
  const trimmedUsername = username.trim();
  const cacheSection = GITHUB_SECTION_CACHE_KEY[section];
  const cached = (await getDashboardCacheBatchCached(trimmedUsername))[cacheSection];

  if (cached?.data != null) {
    return {
      section,
      data: cached.data as T,
      error: null,
      cacheStatus: cached.status,
    };
  }

  const rateLimit = await getRateLimitStateCached();
  if (rateLimit && rateLimit.remaining <= 0) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds < rateLimit.resetAt) {
      return buildRateLimitSectionResult(
        section,
        new Date(rateLimit.resetAt * 1000).toISOString(),
      );
    }
  }

  return dedupeInFlightRequest(`gi:section:${trimmedUsername}:${path}`, () =>
    fetchGithubSectionHttp<T>(section, path, trimmedUsername),
  );
}

const fetchGithubSection = cache(resolveGithubSection);

function pushError(
  errors: DashboardSectionError[],
  section: DashboardSection,
  message: string,
  resetAt?: string | null,
): void {
  errors.push({ section, message, resetAt: resetAt ?? undefined });
}

function buildCacheMeta(
  results: Iterable<FetchSectionResult<unknown>>,
  fetchedAt: Date,
): DashboardCacheMeta {
  const statuses: CacheStatus[] = [];
  let maxAgeSeconds = 0;
  let latestResponseDate: Date | null = null;

  for (const result of results) {
    if (result.cacheStatus) {
      statuses.push(result.cacheStatus);
    }
    if (result.ageSeconds !== undefined) {
      maxAgeSeconds = Math.max(maxAgeSeconds, result.ageSeconds);
    }
    if (result.responseDate) {
      const parsed = new Date(result.responseDate);
      if (!Number.isNaN(parsed.getTime())) {
        if (!latestResponseDate || parsed > latestResponseDate) {
          latestResponseDate = parsed;
        }
      }
    }
  }

  const isStale =
    statuses.includes("STALE") ||
    maxAgeSeconds > DASHBOARD_FRESH_MAX_AGE_SECONDS;

  const lastUpdated = latestResponseDate ?? fetchedAt;

  return {
    lastUpdated: lastUpdated.toISOString(),
    isStale,
  };
}

function mapStreaksApiResponse(data: StreaksApiResponse): StreakData {
  return {
    current: data.current_streak,
    longest: data.longest_streak,
    totalActiveDays: data.total_active_days,
    lastActive: data.last_active_date ?? "",
    timeline: data.timeline
      ? data.timeline.map((point) => ({
          date: point.date,
          active: point.active,
          streakLength: point.streak_length,
          inCurrentStreak: point.in_current_streak,
        }))
      : undefined,
  };
}

function mapNetworkApiResponse(data: NetworkApiResponse): NetworkStats {
  return {
    followersCount: data.followers_count,
    followingCount: data.following_count,
    mutualCount: data.mutual_count,
    topFollowers: data.top_followers.map((user) => ({
      login: user.login,
      avatarUrl: user.avatar_url,
    })),
    topFollowing: data.top_following.map((user) => ({
      login: user.login,
      avatarUrl: user.avatar_url,
    })),
  };
}

function languagesApiToRecord(languages: LanguagesApiResponse["languages"]): Record<string, number> {
  return Object.fromEntries(languages.map(({ language, bytes }) => [language, bytes]));
}

function getDefaultHeatmapYear(contributions: ContributionsApiResponse | null): number {
  if (contributions?.years.length) {
    return contributions.years[0];
  }
  return new Date().getUTCFullYear();
}

function buildActivitySection(
  events: GitHubEvent[],
  contributions: ContributionsApiResponse | null = null,
): ActivitySection {
  const items = events
    .filter((event) => DASHBOARD_ACTIVITY_EVENT_TYPES.has(event.type))
    // server-only: normalize GitHub events into timeline items
    .map(formatActivityItem)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  const defaultYear = getDefaultHeatmapYear(contributions);
  const officialHeatmap =
    contributions?.rollingYear.heatmap ?? contributions?.heatmapByYear[defaultYear];

  return {
    items,
    // server-only: initial date grouping for SSR (client timeline re-groups on pagination)
    groupedByDate: groupActivitiesByDate(items),
    // server-only
    commitFrequency: buildCommitFrequency(events),
    heatmap: officialHeatmap ?? [],
    events,
    officialHeatmapByYear: contributions?.heatmapByYear,
    contributionYears: contributions?.years,
    contributionTotalsByYear: contributions?.totalsByYear,
    rollingYearContributions: contributions?.rollingYear,
  };
}

function buildStreakData(events: GitHubEvent[], weeklyData: WeeklyCommit[]): StreakData {
  return {
    // server-only: calculateStreaks
    ...calculateStreaks(events),
    // server-only: computeConsistencyScore
    consistencyScore: computeConsistencyScore(weeklyData),
  };
}

function attachConsistencyScore(
  streaks: StreakData,
  weeklyData: WeeklyCommit[],
): StreakData {
  return {
    ...streaks,
    // server-only: computeConsistencyScore
    consistencyScore: computeConsistencyScore(weeklyData),
  };
}

export type DashboardProfileResult = {
  profile: UserProfile | null;
  error: string | null;
  resetAt?: string | null;
};

export type DashboardActivityResult = {
  activity: ActivitySection | null;
  error: string | null;
};

export type DashboardLanguagesResult = {
  languages: LanguageBreakdown[];
  error: string | null;
};

export type DashboardReposResult = {
  repos: ReposSection | null;
  error: string | null;
};

export type DashboardStreaksResult = {
  streaks: StreakData | null;
  weeklyData: WeeklyCommit[];
  error: string | null;
};

export type DashboardNetworkResult = {
  network: NetworkStats | null;
  error: string | null;
};

export type DashboardStarredResult = {
  starred: StarredSection | null;
  error: string | null;
};

/** Fetches the GitHub user profile for the dashboard sidebar. */
export async function fetchDashboardProfile(
  username: string,
): Promise<DashboardProfileResult> {
  const login = username.trim();
  const result = await fetchGithubSection<UserApiResponse>("profile", "user", login);

  if (result.data) {
    const { fetchGitHubSocialAccounts } = await import("@/lib/profile-social-graphql");
    const social_accounts = await fetchGitHubSocialAccounts(result.data.login);

    return {
      profile: {
        ...result.data,
        social_accounts: social_accounts.length > 0 ? social_accounts : undefined,
      },
      error: null,
    };
  }

  return {
    profile: null,
    error: result.error,
    resetAt: result.resetAt ?? undefined,
  };
}

async function fetchGithubEventsSection(
  username: string,
): Promise<FetchSectionResult<EventsApiResponse>> {
  return fetchGithubSection<EventsApiResponse>("activity", "events", username.trim());
}

const getGithubEventsSection = cache(fetchGithubEventsSection);

async function fetchGithubContributionsSection(
  username: string,
): Promise<FetchSectionResult<ContributionsApiResponse>> {
  return fetchGithubSection<ContributionsApiResponse>(
    "contributions",
    "contributions",
    username.trim(),
  );
}

const getGithubContributionsSection = cache(fetchGithubContributionsSection);

/** Fetches public events and official GitHub contribution calendar data. */
export async function fetchDashboardActivity(
  username: string,
): Promise<DashboardActivityResult> {
  const [eventsResult, contributionsResult] = await Promise.all([
    getGithubEventsSection(username),
    getGithubContributionsSection(username),
  ]);

  const hasOfficialContributions = Boolean(
    contributionsResult.data?.rollingYear?.heatmap?.length ||
      contributionsResult.data?.heatmapByYear,
  );

  if (hasOfficialContributions || eventsResult.data?.events) {
    return {
      activity: buildActivitySection(
        eventsResult.data?.events ?? [],
        contributionsResult.data,
      ),
      error: hasOfficialContributions ? null : contributionsResult.error,
    };
  }

  return {
    activity: null,
    error: contributionsResult.error ?? eventsResult.error,
  };
}

/** Fetches language byte breakdown across top repositories. */
export async function fetchDashboardLanguages(
  username: string,
): Promise<DashboardLanguagesResult> {
  const result = await fetchGithubSection<LanguagesApiResponse>(
    "languages",
    "languages",
    username.trim(),
  );

  if (result.data) {
    return {
      // server-only: client-safe computeLanguageBreakdown, computed here on the server
      languages: computeLanguageBreakdown(
        languagesApiToRecord(result.data.languages),
      ),
      error: null,
    };
  }

  return { languages: [], error: result.error };
}

/** Fetches ranked public repositories. */
export async function fetchDashboardRepos(username: string): Promise<DashboardReposResult> {
  const result = await fetchGithubSection<ReposApiResponse>(
    "repos",
    "repos",
    username.trim(),
  );

  if (result.data) {
    return {
      repos: {
        // server-only
        repos: rankRepos(result.data.repos),
        languagesSummary: result.data.languages_summary,
        totalFetched: result.data.total_fetched,
        pages: result.data.pages,
      },
      error: null,
    };
  }

  return { repos: null, error: result.error };
}

/** Fetches streak metrics (from events when available, otherwise streaks API). */
export async function fetchDashboardStreaks(
  username: string,
): Promise<DashboardStreaksResult> {
  const [eventsResult, contributionsResult] = await Promise.all([
    getGithubEventsSection(username),
    getGithubContributionsSection(username),
  ]);

  if (contributionsResult.data?.activeDates.length) {
    const activeDays = new Set(contributionsResult.data.activeDates);
    const weeklyData =
      eventsResult.data?.events != null
        ? buildActivitySection(eventsResult.data.events, contributionsResult.data).commitFrequency
            .byWeek
        : [];
    return {
      streaks: attachConsistencyScore(
        calculateStreaksFromActiveDays(activeDays),
        weeklyData,
      ),
      weeklyData,
      error: null,
    };
  }

  if (eventsResult.data?.events) {
    const activity = buildActivitySection(
      eventsResult.data.events,
      contributionsResult.data,
    );
    const weeklyData = activity.commitFrequency.byWeek;
    return {
      streaks: buildStreakData(eventsResult.data.events, weeklyData),
      weeklyData,
      error: null,
    };
  }

  if (isGithubRateLimitErrorMessage(eventsResult.error)) {
    return { streaks: null, weeklyData: [], error: eventsResult.error };
  }

  const streaksResult = await fetchGithubSection<StreaksApiResponse>(
    "streaks",
    "streaks",
    username.trim(),
  );

  if (streaksResult.data) {
    return {
      streaks: attachConsistencyScore(mapStreaksApiResponse(streaksResult.data), []),
      weeklyData: [],
      error: null,
    };
  }

  return { streaks: null, weeklyData: [], error: streaksResult.error };
}

/** Fetches follower / following network summary. */
export async function fetchDashboardNetwork(
  username: string,
): Promise<DashboardNetworkResult> {
  const result = await fetchGithubSection<NetworkApiResponse>(
    "network",
    "network",
    username.trim(),
  );

  if (result.data) {
    return { network: mapNetworkApiResponse(result.data), error: null };
  }

  return { network: null, error: result.error };
}

/** Fetches starred repositories. */
export async function fetchDashboardStarred(
  username: string,
): Promise<DashboardStarredResult> {
  const result = await fetchGithubSection<StarsApiResponse>(
    "starred",
    "stars",
    username.trim(),
  );

  if (result.data) {
    return {
      starred: {
        repos: result.data.repos,
        totalStarredCount: result.data.total_starred_count,
      },
      error: null,
    };
  }

  return { starred: null, error: result.error };
}

/**
 * Fetches all `/api/github/*` sections in parallel and aggregates dashboard data.
 * Intended for server-side use (e.g. dashboard page loaders).
 */
export async function aggregateDashboardData(username: string): Promise<DashboardData> {
  const trimmedUsername = username.trim();
  const errors: DashboardSectionError[] = [];

  const settled = await Promise.allSettled(
    GITHUB_API_ROUTES.map(({ section, path }) =>
      fetchGithubSection<unknown>(section, path, trimmedUsername),
    ),
  );

  const results = new Map<GithubApiSection, FetchSectionResult<unknown>>();

  for (let index = 0; index < settled.length; index += 1) {
    const route = GITHUB_API_ROUTES[index];
    const outcome = settled[index];

    if (outcome.status === "rejected") {
      const message = outcome.reason instanceof Error ? outcome.reason.message : "Unknown error";
      results.set(route.section, { section: route.section, data: null, error: message });
      continue;
    }

    results.set(route.section, outcome.value);
  }

  const getResult = <T>(section: GithubApiSection): FetchSectionResult<T> =>
    results.get(section) as FetchSectionResult<T>;

  const profileResult = getResult<UserApiResponse>("profile");
  let profile: UserProfile | null = null;
  if (profileResult.data) {
    profile = profileResult.data;
  } else if (profileResult.error) {
    pushError(errors, "profile", profileResult.error, profileResult.resetAt);
  }

  const reposResult = getResult<ReposApiResponse>("repos");
  let repos: ReposSection | null = null;
  if (reposResult.data) {
    repos = {
      // server-only
      repos: rankRepos(reposResult.data.repos),
      languagesSummary: reposResult.data.languages_summary,
      totalFetched: reposResult.data.total_fetched,
      pages: reposResult.data.pages,
    };
  } else if (reposResult.error) {
    pushError(errors, "repos", reposResult.error);
  }

  const languagesResult = getResult<LanguagesApiResponse>("languages");
  let languages: LanguageBreakdown[] | null = null;
  if (languagesResult.data) {
    // server-only: client-safe computeLanguageBreakdown, computed here on the server
    languages = computeLanguageBreakdown(languagesApiToRecord(languagesResult.data.languages));
  } else if (languagesResult.error) {
    pushError(errors, "languages", languagesResult.error);
  }

  const eventsResult = getResult<EventsApiResponse>("activity");
  const contributionsResult = getResult<ContributionsApiResponse>("contributions");
  let activity: ActivitySection | null = null;
  let eventsForStreaks: GitHubEvent[] | null = null;
  const hasOfficialContributions = Boolean(
    contributionsResult.data?.rollingYear?.heatmap?.length ||
      contributionsResult.data?.heatmapByYear,
  );

  if (eventsResult.data?.events || hasOfficialContributions) {
    eventsForStreaks = eventsResult.data?.events ?? null;
    activity = buildActivitySection(
      eventsResult.data?.events ?? [],
      contributionsResult.data,
    );
  } else if (eventsResult.error) {
    pushError(errors, "activity", eventsResult.error);
  }

  const streaksResult = getResult<StreaksApiResponse>("streaks");
  let streaks: StreakData | null = null;
  if (contributionsResult.data?.activeDates.length) {
    const activeDays = new Set(contributionsResult.data.activeDates);
    const weeklyData = activity?.commitFrequency.byWeek ?? [];
    streaks = attachConsistencyScore(calculateStreaksFromActiveDays(activeDays), weeklyData);
  } else if (eventsForStreaks) {
    const weeklyData = activity?.commitFrequency.byWeek ?? [];
    streaks = buildStreakData(eventsForStreaks, weeklyData);
  } else if (streaksResult.data) {
    streaks = attachConsistencyScore(mapStreaksApiResponse(streaksResult.data), []);
  } else if (streaksResult.error) {
    pushError(errors, "streaks", streaksResult.error);
  }

  const networkResult = getResult<NetworkApiResponse>("network");
  let network: NetworkStats | null = null;
  if (networkResult.data) {
    network = mapNetworkApiResponse(networkResult.data);
  } else if (networkResult.error) {
    pushError(errors, "network", networkResult.error);
  }

  const starredResult = getResult<StarsApiResponse>("starred");
  let starred: StarredSection | null = null;
  if (starredResult.data) {
    starred = {
      repos: starredResult.data.repos,
      totalStarredCount: starredResult.data.total_starred_count,
    };
  } else if (starredResult.error) {
    pushError(errors, "starred", starredResult.error);
  }

  const fetchedAt = new Date();
  const cacheMeta = buildCacheMeta(results.values(), fetchedAt);

  return {
    username: trimmedUsername,
    profile,
    repos,
    languages,
    activity,
    streaks,
    network,
    starred,
    errors,
    cacheMeta,
  };
}
