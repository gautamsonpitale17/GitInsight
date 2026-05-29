import type { StreakTimelinePoint } from "@/types/github";

/** Days shown in the streak timeline chart (last N UTC days, inclusive). */
export const STREAK_TIMELINE_DAYS = 90;

export type { StreakTimelinePoint };

function toUTCDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getCurrentStreakDateKeys(activeDays: Set<string>, referenceDate: Date): Set<string> {
  const keys = new Set<string>();
  const today = startOfUTCDay(referenceDate);
  const todayKey = toUTCDateKey(today);
  let cursor = new Date(today);

  if (!activeDays.has(todayKey)) {
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    if (!activeDays.has(toUTCDateKey(yesterday))) {
      return keys;
    }
    cursor = yesterday;
  }

  while (activeDays.has(toUTCDateKey(cursor))) {
    keys.add(toUTCDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return keys;
}

/** Builds daily streak lengths for the timeline chart (oldest → newest). */
export function buildStreakTimeline(
  activeDays: Set<string>,
  referenceDate = new Date(),
  dayCount = STREAK_TIMELINE_DAYS,
): StreakTimelinePoint[] {
  const end = startOfUTCDay(referenceDate);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (dayCount - 1));

  const currentStreakKeys = getCurrentStreakDateKeys(activeDays, end);
  const points: StreakTimelinePoint[] = [];
  let runningStreak = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const key = toUTCDateKey(cursor);
    const active = activeDays.has(key);
    runningStreak = active ? runningStreak + 1 : 0;

    points.push({
      date: key,
      active,
      streakLength: runningStreak,
      inCurrentStreak: currentStreakKeys.has(key),
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return points;
}

export type StreakTimelineApiPoint = {
  date: string;
  active: boolean;
  streak_length: number;
  in_current_streak: boolean;
};

export function streakTimelineToApi(points: StreakTimelinePoint[]): StreakTimelineApiPoint[] {
  return points.map((point) => ({
    date: point.date,
    active: point.active,
    streak_length: point.streakLength,
    in_current_streak: point.inCurrentStreak,
  }));
}

export function streakTimelineFromApi(points: StreakTimelineApiPoint[]): StreakTimelinePoint[] {
  return points.map((point) => ({
    date: point.date,
    active: point.active,
    streakLength: point.streak_length,
    inCurrentStreak: point.in_current_streak,
  }));
}
