import { format } from "date-fns/format";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import {
  GITHUB_API_TIMEOUT_MESSAGE,
  RATE_LIMIT_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
} from "@/lib/dashboard-errors";
import type { DashboardSection, DashboardSectionError } from "@/types/github";

const LOCALE = "en-US";

/** Warm, encouraging empty-state copy (not robotic). */
export const EMPTY_COPY = {
  activity: "No public activity in this window — your next push will show up here.",
  activitySection: "No public activity in this window — check back after the next push.",
  commits: "No commit data in this range yet.",
  commitsWeekday: "No weekday commit pattern yet — keep pushing to fill this chart.",
  commitsHour: "No hourly commit pattern yet — activity will appear as you push.",
  commitsWeekly: "No weekly commit history in this range yet.",
  contributions: (year: number) =>
    `No contributions in ${year} yet — activity will appear here as you contribute on GitHub.`,
  heatmapDay: "No public push events on this day. Other contribution types may still count on GitHub.",
  languages: "No language breakdown yet — code in your top repos will appear here.",
  network: "No network stats available right now — try refreshing in a moment.",
  networkFollowers: "No top followers to show yet.",
  networkFollowing: "No top following to show yet.",
  insights: "No insights yet — activity will generate tips as you contribute.",
  repos: "No public repositories to show yet.",
  starred: "No starred repositories to highlight yet.",
  streaks: "No streak stats yet — your first push starts the clock.",
  streakTimeline: "No push activity in the last 90 days — your streak line will grow from here.",
  topRepos: "No public repositories yet — create one on GitHub to see it here.",
} as const;

function parseDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function toUTCDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Formats integers with grouping separators (e.g. 1,234). */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Math.round(value).toLocaleString(LOCALE);
}

/**
 * Star counts ≥ 1,000 render compactly (e.g. 1.2k).
 * Values below 1,000 use comma grouping.
 */
export function formatStarCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "0";
  }

  if (value < 1000) {
    return formatCount(value);
  }

  const thousands = value / 1000;
  if (thousands >= 10) {
    return `${Math.round(thousands)}k`;
  }

  const rounded = Math.round(thousands * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}k`;
}

/**
 * Display date: "Jan 15, 2024" — year omitted when it matches the reference year.
 */
export function formatDisplayDate(
  value: Date | string,
  referenceDate: Date = new Date(),
): string {
  const date = parseDate(value);
  if (!date) {
    return "Unknown date";
  }

  const sameYear = date.getFullYear() === referenceDate.getFullYear();
  return format(date, sameYear ? "MMM d" : "MMM d, yyyy");
}

/** Parses `YYYY-MM-DD` and formats with {@link formatDisplayDate}. */
export function formatDateKey(
  dateKey: string,
  referenceDate: Date = new Date(),
): string {
  const date = parseDateKey(dateKey);
  if (!date) {
    return dateKey;
  }
  return formatDisplayDate(date, referenceDate);
}

/** Long heading date for panels and screen readers. */
export function formatLongDate(
  value: Date | string,
  referenceDate: Date = new Date(),
): string {
  const date = parseDate(value);
  if (!date) {
    return "Unknown date";
  }

  const sameYear = date.getFullYear() === referenceDate.getFullYear();
  return format(date, sameYear ? "EEEE, MMMM d" : "EEEE, MMMM d, yyyy");
}

/** Long heading from a UTC date key (`YYYY-MM-DD`). */
export function formatLongDateKey(
  dateKey: string,
  referenceDate: Date = new Date(),
): string {
  const date = parseDateKey(dateKey);
  if (!date) {
    return dateKey;
  }
  return formatLongDate(date, referenceDate);
}

/** Relative time with suffix, e.g. "2 hours ago". */
export function formatRelativeTime(value: Date | string): string {
  const date = parseDate(value);
  if (!date) {
    return "";
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Clock time for activity rows, e.g. "14:30". */
export function formatTime(value: Date | string): string {
  const date = parseDate(value);
  if (!date) {
    return "";
  }
  return format(date, "HH:mm");
}

/** Date + time for "Last updated" style labels. */
export function formatDisplayDateTime(value: Date | string): string {
  const date = parseDate(value);
  if (!date) {
    return "Unknown";
  }
  return `${formatDisplayDate(date)} at ${format(date, "h:mm a")}`;
}

/** Activity timeline day headings: Today, Yesterday, or formatted date. */
export function formatActivityDateHeading(
  dateKey: string,
  referenceDate: Date = new Date(),
): string {
  const todayKey = toUTCDateKey(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setUTCDate(referenceDate.getUTCDate() - 1);
  const yesterdayKey = toUTCDateKey(yesterday);

  if (dateKey === todayKey) {
    return "Today";
  }
  if (dateKey === yesterdayKey) {
    return "Yesterday";
  }

  try {
    return formatDateKey(dateKey, referenceDate);
  } catch {
    return dateKey;
  }
}

function getMinutesUntilReset(resetAt: string | Date): number {
  const target = parseDate(resetAt);
  if (!target) {
    return 0;
  }
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 60_000));
}

/** User-facing rate-limit message with minutes until retry. */
export function formatRateLimitMessage(resetAt?: string | Date | null): string {
  if (!resetAt) {
    return "Rate limited by GitHub — try again in a few minutes.";
  }

  const minutes = getMinutesUntilReset(resetAt);
  if (minutes <= 0) {
    return "Rate limited by GitHub — try again in a moment.";
  }
  if (minutes === 1) {
    return "Rate limited by GitHub — try again in 1 minute.";
  }
  return `Rate limited by GitHub — try again in ${formatCount(minutes)} minutes.`;
}

function isRateLimitMessage(message: string): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  return (
    message === RATE_LIMIT_MESSAGE ||
    message.startsWith(`${RATE_LIMIT_MESSAGE}::`)
  );
}

/** Maps internal/API error strings to actionable user-facing copy. */
export function formatUserErrorMessage(
  message: string,
  resetAt?: string | null,
): string {
  if (isRateLimitMessage(message)) {
    return formatRateLimitMessage(resetAt ?? extractResetAtFromMessage(message));
  }

  if (message === GITHUB_API_TIMEOUT_MESSAGE) {
    return "GitHub is taking longer than usual — we're refreshing this section automatically.";
  }

  if (message === USER_NOT_FOUND_MESSAGE) {
    return "We couldn't find that GitHub user. Double-check the username and try again.";
  }

  if (/^404\b/i.test(message) || /not found/i.test(message)) {
    return "We couldn't find that resource on GitHub. Check the username and try again.";
  }

  if (/timeout/i.test(message)) {
    return "GitHub is taking longer than usual — wait a moment and try again.";
  }

  return message;
}

function extractResetAtFromMessage(message: string): string | null {
  const marker = `${RATE_LIMIT_MESSAGE}::`;
  if (message.startsWith(marker)) {
    return message.slice(marker.length) || null;
  }
  return null;
}

/** Resolves a dashboard section error into display copy. */
export function formatSectionError(
  entry: Pick<DashboardSectionError, "message" | "resetAt">,
): string {
  return formatUserErrorMessage(entry.message, entry.resetAt);
}

export function getFormattedSectionError(
  errors: DashboardSectionError[],
  section: DashboardSection,
): string | undefined {
  const entry = errors.find((item) => item.section === section);
  if (!entry) {
    return undefined;
  }
  return formatSectionError(entry);
}

/** Prefixes relative time for repo "updated" labels. */
export function formatUpdatedAgo(updatedAt: string): string {
  const relative = formatRelativeTime(updatedAt);
  if (!relative) {
    return "Updated recently";
  }
  return `Updated ${relative}`;
}

/** User-facing rate-limit page title. */
export const RATE_LIMIT_TITLE = "GitHub rate limit reached";

/** User-facing not-found page title. */
export const USER_NOT_FOUND_TITLE = "GitHub user not found";
