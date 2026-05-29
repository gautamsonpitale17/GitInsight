import { getLanguageColor } from "@/lib/constants";
import type {
  GitHubEvent,
  HeatmapCell,
  HeatmapDayPush,
  HeatmapLevel,
  LanguageBreakdown,
} from "@/types/github";

export { groupActivitiesByDate } from "@/lib/activity-grouping";

const WEEKS = 52;
const DAYS = 7;
const MS_PER_DAY = 86_400_000;

export const DEFAULT_HEATMAP_YEARS = [2026, 2025] as const;
const MIN_LANGUAGE_SHARE_PERCENT = 0.5;
const MAX_LANGUAGE_BREAKDOWN = 8;

function toUTCDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Sunday at UTC midnight, 52 weeks before the reference date's week. */
function getHeatmapStartSunday(referenceDate = new Date()): Date {
  const today = startOfUTCDay(referenceDate);
  const sunday52WeeksAgo = new Date(today);
  sunday52WeeksAgo.setUTCDate(today.getUTCDate() - WEEKS * DAYS);
  sunday52WeeksAgo.setUTCDate(sunday52WeeksAgo.getUTCDate() - sunday52WeeksAgo.getUTCDay());
  return sunday52WeeksAgo;
}

function getHeatmapLevel(count: number): HeatmapLevel {
  if (count <= 0) {
    return 0;
  }
  if (count <= 3) {
    return 1;
  }
  if (count <= 6) {
    return 2;
  }
  if (count <= 9) {
    return 3;
  }
  return 4;
}

const EMPTY_GIT_SHA = "0000000000000000000000000000000000000000";

/**
 * Commit count for a PushEvent. GitHub often omits `payload.commits` now; fall back to
 * `size` or treat a push with a new `head` as at least one commit.
 */
export function getPushEventCommitCount(payload?: Record<string, unknown>): number {
  if (!payload) {
    return 0;
  }

  const commits = payload.commits;
  if (Array.isArray(commits) && commits.length > 0) {
    return commits.length;
  }

  const size = payload.size;
  if (typeof size === "number" && Number.isFinite(size) && size > 0) {
    return size;
  }

  const head = payload.head;
  if (typeof head !== "string" || head.length === 0 || head === EMPTY_GIT_SHA) {
    return 0;
  }

  const before = payload.before;
  if (typeof before !== "string" || before.length === 0 || before === EMPTY_GIT_SHA) {
    return 1;
  }

  return before !== head ? 1 : 0;
}

function accumulatePushCommitCounts(events: GitHubEvent[]): Map<string, number> {
  const countsByDate = new Map<string, number>();

  for (const event of events) {
    if (event.type !== "PushEvent") {
      continue;
    }

    const commitCount = getPushEventCommitCount(event.payload);
    if (commitCount <= 0) {
      continue;
    }

    const eventDate = new Date(event.created_at);
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    const dateKey = toUTCDateKey(eventDate);
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + commitCount);
  }

  return countsByDate;
}

function getCalendarYearStartSunday(year: number): Date {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const startSunday = new Date(jan1);
  startSunday.setUTCDate(jan1.getUTCDate() - jan1.getUTCDay());
  return startSunday;
}

function getCalendarYearWeekCount(year: number): number {
  const startSunday = getCalendarYearStartSunday(year);
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const endSaturday = new Date(dec31);
  const endDay = dec31.getUTCDay();

  if (endDay !== 6) {
    endSaturday.setUTCDate(dec31.getUTCDate() + (6 - endDay));
  }

  const totalDays =
    Math.floor((endSaturday.getTime() - startSunday.getTime()) / MS_PER_DAY) + 1;
  return Math.ceil(totalDays / DAYS);
}

/** Filters events to those whose `created_at` falls in the given UTC calendar year. */
export function filterEventsByCalendarYear(
  events: GitHubEvent[],
  year: number,
): GitHubEvent[] {
  return events.filter((event) => {
    const eventDate = new Date(event.created_at);
    return !Number.isNaN(eventDate.getTime()) && eventDate.getUTCFullYear() === year;
  });
}

/** Builds counts keyed by UTC date from an existing heatmap grid. */
export function countsFromHeatmapCells(cells: HeatmapCell[][]): Map<string, number> {
  const countsByDate = new Map<string, number>();

  for (const row of cells) {
    for (const cell of row) {
      if (!cell?.date) {
        continue;
      }
      countsByDate.set(cell.date, cell.count);
    }
  }

  return countsByDate;
}

/**
 * Builds a 7×N heatmap (day rows × week columns) for a calendar year.
 * Row-major order: each row is a weekday (Sunday–Saturday), each column is a week.
 */
export function buildHeatmapGridFromCounts(
  countsByDate: Map<string, number>,
  year: number,
): HeatmapCell[][] {
  const startSunday = getCalendarYearStartSunday(year);
  const weeks = getCalendarYearWeekCount(year);
  const grid: HeatmapCell[][] = [];

  for (let day = 0; day < DAYS; day += 1) {
    const row: HeatmapCell[] = [];

    for (let week = 0; week < weeks; week += 1) {
      const cellDate = new Date(startSunday.getTime() + (week * DAYS + day) * MS_PER_DAY);
      const date = toUTCDateKey(cellDate);
      const inYear = cellDate.getUTCFullYear() === year;
      const count = inYear ? (countsByDate.get(date) ?? 0) : 0;

      row.push({
        date,
        count,
        level: inYear ? getHeatmapLevel(count) : 0,
      });
    }

    grid.push(row);
  }

  return grid;
}

export function buildHeatmapGridForYear(events: GitHubEvent[], year: number): HeatmapCell[][] {
  return buildHeatmapGridFromCounts(accumulatePushCommitCounts(events), year);
}

export function getTotalContributionsForYear(
  countsByDate: Map<string, number>,
  year: number,
): number {
  let total = 0;

  for (const [dateKey, count] of countsByDate) {
    if (Number(dateKey.slice(0, 4)) === year) {
      total += count;
    }
  }

  return total;
}

export function formatHeatmapPushEvent(event: GitHubEvent): HeatmapDayPush | null {
  if (event.type !== "PushEvent") {
    return null;
  }

  const commitCount = getPushEventCommitCount(event.payload);
  if (commitCount <= 0) {
    return null;
  }

  const commits = event.payload?.commits;
  const firstCommit = Array.isArray(commits) ? commits[0] : null;
  const firstCommitMessage =
    firstCommit &&
    typeof firstCommit === "object" &&
    "message" in firstCommit &&
    typeof firstCommit.message === "string"
      ? firstCommit.message
      : null;
  const repo = event.repo.name;
  const label = commitCount === 1 ? "commit" : "commits";

  return {
    id: event.id,
    repo,
    createdAt: event.created_at,
    commitCount,
    firstCommitMessage,
    description: `Pushed ${commitCount} ${label} to ${repo}`,
  };
}

/** Push events on a single UTC day, newest first. */
export function getPushEventsForDate(
  events: GitHubEvent[],
  dateKey: string,
): HeatmapDayPush[] {
  return events
    .map(formatHeatmapPushEvent)
    .filter((item): item is HeatmapDayPush => {
      if (!item) {
        return false;
      }

      const eventDate = new Date(item.createdAt);
      return !Number.isNaN(eventDate.getTime()) && toUTCDateKey(eventDate) === dateKey;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Builds a 7×52 heatmap (day rows × week columns) for the past year.
 * Row-major order: each row is a weekday (Sunday–Saturday), each column is a week.
 */
export function buildHeatmapGrid(events: GitHubEvent[]): HeatmapCell[][] {
  const startSunday = getHeatmapStartSunday();
  const countsByDate = accumulatePushCommitCounts(events);
  const grid: HeatmapCell[][] = [];

  for (let day = 0; day < DAYS; day += 1) {
    const row: HeatmapCell[] = [];

    for (let week = 0; week < WEEKS; week += 1) {
      const cellDate = new Date(startSunday.getTime() + (week * DAYS + day) * MS_PER_DAY);
      const date = toUTCDateKey(cellDate);
      const count = countsByDate.get(date) ?? 0;

      row.push({
        date,
        count,
        level: getHeatmapLevel(count),
      });
    }

    grid.push(row);
  }

  return grid;
}

/** Builds a sorted, capped language breakdown from aggregated byte counts. */
export function computeLanguageBreakdown(raw: Record<string, number>): LanguageBreakdown[] {
  const total = Object.values(raw).reduce((sum, bytes) => sum + Math.max(0, bytes), 0);
  if (total <= 0) {
    return [];
  }

  return Object.entries(raw)
    .map(([name, bytes]) => ({ name, bytes: Math.max(0, bytes) }))
    .filter(({ bytes }) => bytes > 0)
    .filter(({ bytes }) => (bytes / total) * 100 >= MIN_LANGUAGE_SHARE_PERCENT)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, MAX_LANGUAGE_BREAKDOWN)
    .map(({ name, bytes }) => ({
      name,
      bytes,
      percent: Math.round((bytes / total) * 1000) / 10,
      color: getLanguageColor(name),
    }));
}
