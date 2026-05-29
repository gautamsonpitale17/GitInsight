import { getPushEventCommitCount } from "@/lib/analytics-client";
import { apiErrorResponse, apiJsonResponse } from "@/lib/api-route";
import { cacheWithSWR, CacheKeys, isCacheWarmRequest } from "@/lib/cache";
import { GitHubClient } from "@/lib/github";
import { handleGithubApiRouteError } from "@/lib/github-route";
import { GITHUB_API_TIMEOUT_MS, withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportedEventType =
  | "PushEvent"
  | "PullRequestEvent"
  | "IssuesEvent"
  | "CreateEvent"
  | "WatchEvent"
  | "ForkEvent";

interface GitHubEvent {
  id: string;
  type: string;
  repo: {
    name: string;
  };
  created_at: string;
  payload?: Record<string, unknown>;
}

interface PushEventPayload {
  commitCount: number;
  firstCommitMessage: string | null;
}

interface CommitsByWeek {
  week: string;
  count: number;
}

interface Activity {
  id: string;
  type: SupportedEventType;
  repo: string;
  createdAt: string;
  payload: Record<string, unknown> | PushEventPayload | null;
}

const SUPPORTED_TYPES: readonly SupportedEventType[] = [
  "PushEvent",
  "PullRequestEvent",
  "IssuesEvent",
  "CreateEvent",
  "WatchEvent",
  "ForkEvent",
];

function isSupportedEventType(type: string): type is SupportedEventType {
  return SUPPORTED_TYPES.includes(type as SupportedEventType);
}

function mapPayload(event: GitHubEvent): Record<string, unknown> | PushEventPayload | null {
  if (!event.payload) {
    return null;
  }

  if (event.type === "PushEvent") {
    const commitCount = getPushEventCommitCount(event.payload ?? undefined);

    return {
      commitCount,
      firstCommitMessage: null,
    };
  }

  return event.payload;
}

function getISOWeekInfo(date: Date): { isoYear: number; isoWeek: number; isoLabel: string } {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const isoLabel = `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;

  return { isoYear, isoWeek, isoLabel };
}

function getLast52ISOWeeks(referenceDate: Date): CommitsByWeek[] {
  const weekBuckets: CommitsByWeek[] = [];
  const reference = new Date(referenceDate);

  for (let i = 51; i >= 0; i -= 1) {
    const weekDate = new Date(reference);
    weekDate.setUTCDate(reference.getUTCDate() - (i * 7));
    const { isoLabel } = getISOWeekInfo(weekDate);
    weekBuckets.push({ week: isoLabel, count: 0 });
  }

  return weekBuckets;
}

function getPushEventCommitTimestamps(events: GitHubEvent[]): Date[] {
  return events.flatMap((event) => {
    if (event.type !== "PushEvent") {
      return [];
    }

    const commitCount = getPushEventCommitCount(event.payload ?? undefined);
    if (commitCount <= 0) {
      return [];
    }

    const eventTimestamp = new Date(event.created_at);
    if (Number.isNaN(eventTimestamp.getTime())) {
      return [];
    }

    return Array.from({ length: commitCount }, () => eventTimestamp);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiErrorResponse({ error: "username query parameter is required" }, 400, { request });
    }

    const { data, status } = await cacheWithSWR(
      CacheKeys.events(username),
      () =>
        withTimeout(
          (async () => {
            const github = new GitHubClient();
            const { data: events } = await github.fetchPaginated<GitHubEvent>(
              `/users/${encodeURIComponent(username)}/events/public`,
              { per_page: 30, page: 1 },
              10,
            );

            const supportedEvents = events.filter(
              (event): event is GitHubEvent & { type: SupportedEventType } =>
                isSupportedEventType(event.type),
            );

            const activities: Activity[] = supportedEvents
              .map((event) => ({
                id: event.id,
                type: event.type,
                repo: event.repo.name,
                createdAt: event.created_at,
                payload: mapPayload(event),
              }))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 50);

            const commitsByWeekday = Array<number>(7).fill(0);
            const commitsByHour = Array<number>(24).fill(0);
            const commitsByWeek = getLast52ISOWeeks(new Date());
            const weekIndexByLabel = new Map(commitsByWeek.map((entry, index) => [entry.week, index]));

            const commitTimestamps = getPushEventCommitTimestamps(events);
            for (const timestamp of commitTimestamps) {
              commitsByWeekday[timestamp.getUTCDay()] += 1;
              commitsByHour[timestamp.getUTCHours()] += 1;

              const { isoLabel } = getISOWeekInfo(timestamp);
              const weekIndex = weekIndexByLabel.get(isoLabel);
              if (typeof weekIndex === "number") {
                commitsByWeek[weekIndex].count += 1;
              }
            }

            return {
              activities,
              events: supportedEvents,
              commits_by_weekday: commitsByWeekday,
              commits_by_hour: commitsByHour,
              commits_by_week: commitsByWeek,
            };
          })(),
          GITHUB_API_TIMEOUT_MS,
        ),
      180,
      1800,
      { skipWrite: isCacheWarmRequest(request) },
    );

    const EVENTS_PAGE_SIZE = 20;
    const pageParam = searchParams.get("page");
    const parsedPage = Number.parseInt(pageParam ?? "1", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const totalCount = data.activities.length;
    const start = (page - 1) * EVENTS_PAGE_SIZE;
    const activities = data.activities.slice(start, start + EVENTS_PAGE_SIZE);
    const hasMore = start + EVENTS_PAGE_SIZE < totalCount;

    return apiJsonResponse(
      {
        activities,
        events: data.events,
        totalCount,
        hasMore,
        page,
        commits_by_weekday: data.commits_by_weekday,
        commits_by_hour: data.commits_by_hour,
        commits_by_week: data.commits_by_week,
      },
      { sMaxAge: 180, staleWhileRevalidate: 1620 },
      { headers: { "X-Cache": status }, request },
    );
  } catch (error) {
    return handleGithubApiRouteError(error, request);
  }
}
