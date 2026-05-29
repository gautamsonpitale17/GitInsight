import { getPushEventCommitCount } from "@/lib/analytics-client";
import { apiErrorResponse, apiJsonResponse } from "@/lib/api-route";
import { cache, CacheKeys, isCacheWarmRequest } from "@/lib/cache";
import { GitHubClient } from "@/lib/github";
import { handleGithubApiRouteError } from "@/lib/github-route";
import { buildStreakTimeline, streakTimelineToApi } from "@/lib/streak-timeline";
import { GITHUB_API_TIMEOUT_MS, withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface GitHubEvent {
  type: string;
  created_at: string;
  payload?: Record<string, unknown>;
}

interface CommitsByWeek {
  week: string;
  count: number;
}

function toUTCDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getISOWeekInfo(date: Date): { isoLabel: string } {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { isoLabel: `${isoYear}-W${String(isoWeek).padStart(2, "0")}` };
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

function extractPushCommitTimestamps(events: GitHubEvent[]): Date[] {
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

function extractPushEventDates(events: GitHubEvent[]): Date[] {
  return events
    .filter((event) => event.type === "PushEvent")
    .filter((event) => getPushEventCommitCount(event.payload ?? undefined) > 0)
    .map((event) => new Date(event.created_at))
    .filter((date) => !Number.isNaN(date.getTime()));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return apiErrorResponse({ error: "username query parameter is required" }, 400, { request });
    }

    const { data, status } = await cache(
      CacheKeys.streaks(username),
      () =>
        withTimeout(
          (async () => {
            const github = new GitHubClient();
            const { data: events } = await github.fetchPaginated<GitHubEvent>(
              `/users/${encodeURIComponent(username)}/events/public`,
              { per_page: 30, page: 1 },
              10,
            );

            const now = new Date();
            const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const yearAgoUtc = new Date(todayUtc);
            yearAgoUtc.setUTCDate(todayUtc.getUTCDate() - 364);

            const commitsByWeek = getLast52ISOWeeks(todayUtc);
            const weekIndexByLabel = new Map(commitsByWeek.map((entry, index) => [entry.week, index]));

            const commitTimestamps = extractPushCommitTimestamps(events);
            for (const timestamp of commitTimestamps) {
              const { isoLabel } = getISOWeekInfo(timestamp);
              const weekIndex = weekIndexByLabel.get(isoLabel);
              if (typeof weekIndex === "number") {
                commitsByWeek[weekIndex].count += 1;
              }
            }

            const pushEventDates = extractPushEventDates(events);
            const activeDays = new Set<string>();
            const yearAgoKey = toUTCDateKey(yearAgoUtc);
            const todayKey = toUTCDateKey(todayUtc);

            for (const date of pushEventDates) {
              const dayKey = toUTCDateKey(date);
              if (dayKey >= yearAgoKey && dayKey <= todayKey) {
                activeDays.add(dayKey);
              }
            }

            const totalActiveDays = activeDays.size;

            let currentStreak = 0;
            const cursor = new Date(todayUtc);
            while (cursor >= yearAgoUtc) {
              const key = toUTCDateKey(cursor);
              if (!activeDays.has(key)) {
                break;
              }
              currentStreak += 1;
              cursor.setUTCDate(cursor.getUTCDate() - 1);
            }

            let longestStreak = 0;
            let runningStreak = 0;
            const streakCursor = new Date(yearAgoUtc);
            while (streakCursor <= todayUtc) {
              const key = toUTCDateKey(streakCursor);
              if (activeDays.has(key)) {
                runningStreak += 1;
                if (runningStreak > longestStreak) {
                  longestStreak = runningStreak;
                }
              } else {
                runningStreak = 0;
              }
              streakCursor.setUTCDate(streakCursor.getUTCDate() + 1);
            }

            const sortedActiveDates = [...activeDays].sort();
            const lastActiveDate =
              sortedActiveDates.length > 0 ? sortedActiveDates[sortedActiveDates.length - 1] : null;

            const timeline = buildStreakTimeline(activeDays, todayUtc);

            return {
              current_streak: currentStreak,
              longest_streak: longestStreak,
              total_active_days: totalActiveDays,
              last_active_date: lastActiveDate,
              timeline: streakTimelineToApi(timeline),
            };
          })(),
          GITHUB_API_TIMEOUT_MS,
        ),
      300,
      { skipWrite: isCacheWarmRequest(request) },
    );

    return apiJsonResponse(data, { sMaxAge: 300 }, { headers: { "X-Cache": status }, request });
  } catch (error) {
    return handleGithubApiRouteError(error, request);
  }
}
