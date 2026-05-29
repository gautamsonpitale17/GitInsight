import "server-only";

import type { WeeklyCommit } from "@/types/github";

const CONSISTENCY_WINDOW_WEEKS = 26;
const CONSISTENCY_ACTIVE_WEEK_POINTS = 2;
const CONSISTENCY_ACTIVE_WEEK_CAP = 52;
const CONSISTENCY_CONSECUTIVE_RUN_CAP = 10;
const CONSISTENCY_HIGH_VOLUME_CAP = 10;
const CONSISTENCY_HIGH_VOLUME_THRESHOLD = 10;
const CONSISTENCY_CONSECUTIVE_RUN_MIN = 4;
const CONSISTENCY_RAW_MAX =
  CONSISTENCY_ACTIVE_WEEK_CAP +
  CONSISTENCY_CONSECUTIVE_RUN_CAP +
  CONSISTENCY_HIGH_VOLUME_CAP;

export type ConsistencyGrade = "S" | "A" | "B" | "C" | "D";

export interface ConsistencyScoreResult {
  score: number;
  grade: ConsistencyGrade;
}

export function getConsistencyGrade(score: number): ConsistencyGrade {
  if (score >= 90) {
    return "S";
  }
  if (score >= 75) {
    return "A";
  }
  if (score >= 60) {
    return "B";
  }
  if (score >= 45) {
    return "C";
  }
  return "D";
}

function countConsecutiveActiveRuns(weeks: WeeklyCommit[], minLength: number): number {
  let runLength = 0;
  let runs = 0;

  for (const week of weeks) {
    if (week.count > 0) {
      runLength += 1;
      continue;
    }

    if (runLength >= minLength) {
      runs += 1;
    }
    runLength = 0;
  }

  if (runLength >= minLength) {
    runs += 1;
  }

  return runs;
}

/** Scores commit consistency over the last 26 weeks (0–100) with a letter grade. */
export function computeConsistencyScore(weeklyData: WeeklyCommit[]): ConsistencyScoreResult {
  const weeks = weeklyData.slice(-CONSISTENCY_WINDOW_WEEKS);

  const activeWeeks = weeks.filter((week) => week.count > 0).length;
  const activePoints = Math.min(
    activeWeeks * CONSISTENCY_ACTIVE_WEEK_POINTS,
    CONSISTENCY_ACTIVE_WEEK_CAP,
  );

  const consecutiveRuns = countConsecutiveActiveRuns(weeks, CONSISTENCY_CONSECUTIVE_RUN_MIN);
  const consecutiveBonus = Math.min(consecutiveRuns, CONSISTENCY_CONSECUTIVE_RUN_CAP);

  const highVolumeWeeks = weeks.filter(
    (week) => week.count >= CONSISTENCY_HIGH_VOLUME_THRESHOLD,
  ).length;
  const highVolumeBonus = Math.min(highVolumeWeeks, CONSISTENCY_HIGH_VOLUME_CAP);

  const raw = activePoints + consecutiveBonus + highVolumeBonus;
  const score = Math.min(100, Math.round((raw / CONSISTENCY_RAW_MAX) * 100));

  return {
    score,
    grade: getConsistencyGrade(score),
  };
}
