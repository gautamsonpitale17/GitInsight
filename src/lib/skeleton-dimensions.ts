/**
 * Hardcoded skeleton sizes measured from production UI (Tailwind classes + chart constants).
 * Keep in sync when layout or typography changes.
 */

/** Profile sidebar (`DashboardLayout` aside). */
export const SIDEBAR_AVATAR_PX = 220;
export const SIDEBAR_AVATAR_LG_PX = 240;
export const SIDEBAR_AVATAR_XL_PX = 260;
export const SIDEBAR_NAME_H_PX = 20;
export const SIDEBAR_COMPACT_AVATAR_PX = 48;
export const SIDEBAR_HANDLE_H_PX = 20;
export const SIDEBAR_BIO_LINE_H_PX = 21;
export const SIDEBAR_META_ROW_H_PX = 21;
export const SIDEBAR_STATS_ROW_H_PX = 21;
export const SIDEBAR_GITHUB_BTN_H_PX = 38; // py-2 text-sm + border

/** Inline dashboard header (`DashboardHeader`). */
export const HEADER_AVATAR_PX = 32;
export const HEADER_LOGIN_H_PX = 24; // text-base font-semibold
export const HEADER_META_H_PX = 16; // text-xs row
export const HEADER_SEARCH_H_PX = 38; // py-1.5 border box

/** Stat cards (`StatCards`). */
export const STAT_CARD_LABEL_H_PX = 16; // text-xs leading-4
export const STAT_CARD_VALUE_H_PX = 30; // text-gh-stat (24px / lh 1.25)
export const STAT_CARD_ICON_PX = 16;

/** Top repositories list rows. */
export const REPO_ROW_TITLE_H_PX = 20; // text-sm font-semibold
export const REPO_ROW_DESC_H_PX = 20; // text-sm mt-1
export const REPO_ROW_META_H_PX = 16; // text-xs mt-2
export const REPO_ROW_UPDATED_H_PX = 16; // text-xs mt-1.5
export const REPO_ROW_PY_PX = 12; // py-3
/** Top repositories section — 3 columns × 2 rows. */
export const REPO_GRID_COUNT = 6;
export const REPO_TITLE_WIDTHS = ["60%", "75%", "55%", "70%", "65%", "68%"] as const;
export const REPO_DESC_WIDTHS = ["88%", "72%", "80%", "65%", "78%", "70%"] as const;
export const REPO_META_WIDTH_PX = 56;

/** Streak panel (`StreakStats`). */
export const STREAK_LABEL_H_PX = 20;
export const STREAK_CURRENT_VALUE_H_PX = 30; // streak-stat-value (24px / lh 1.25)
export const STREAK_LONGEST_VALUE_H_PX = 30;
export const STREAK_ACTIVE_VALUE_H_PX = 30;
export const STREAK_PROGRESS_H_PX = 4;
export const STREAK_CAPTION_H_PX = 16;
export const STREAK_TIMELINE_CHART_H_PX = 80;
export const STREAK_TIMELINE_LABELS_H_PX = 16;

/** Activity timeline rows. */
export const ACTIVITY_ICON_PX = 32;
export const ACTIVITY_HEADING_H_PX = 16;
export const ACTIVITY_DESC_H_PX = 20;
export const ACTIVITY_REPO_H_PX = 16;
export const ACTIVITY_ROW_PY_PX = 12;
export const ACTIVITY_LINE_WIDTHS = ["92%", "78%", "85%", "70%", "88%"] as const;
export const ACTIVITY_SKELETON_ROWS = 5;

/** Charts. */
export const LANGUAGE_DONUT_PX = 220;
export const COMMIT_BAR_CHART_H_PX = 240;
export const COMMIT_BAR_COMPACT_H_PX = 140;
export const COMMIT_FREQUENCY_SUBSECTIONS = 3;
export const COMMIT_FREQUENCY_SUBHEADER_H_PX = 16; // text-xs uppercase mb-2
export const COMMIT_FREQUENCY_SUBHEADER_MB_PX = 12;
export const COMMIT_FREQUENCY_SECTION_GAP_PX = 16; // section-in-card-title padding-top
export const COMMITS_BY_WEEKDAY_CHART_H_PX = 200;
export const COMMITS_BY_WEEKDAY_CHART_H_MOBILE_PX = 160;
export const COMMITS_BY_WEEKDAY_PEAK_H_PX = 20;
export const COMMIT_SPARKLINE_H_PX = 64;
export const COMMIT_SPARKLINE_LABELS_H_PX = 16;

/** Hour-of-day heat strip (`CommitsByHour`). */
export const HOUR_CHART_STRIP_H_PX = 44; // 28 + 16 (hour cells + labels)
export const HOUR_CHART_PEAK_H_PX = 20;
export const HOUR_CHART_LEGEND_H_PX = 32;

/** Starred repos rows. */
export const STARRED_RANK_W_PX = 20;
export const STARRED_AVATAR_PX = 20;
export const STARRED_TITLE_H_PX = 20;
export const STARRED_DESC_H_PX = 16;
export const STARRED_META_H_PX = 16;
export const STARRED_ROW_COUNT = 3;
export const STARRED_TITLE_WIDTHS = ["70%", "58%", "64%"] as const;

/** Network section. */
export const NETWORK_STAT_H_PX = 50; // label 14px + text-gh-stat 24px
export const NETWORK_LIST_ROW_H_PX = 28; // avatar 24 + gap
export const NETWORK_LIST_ROWS = 4;

export function commitFrequencySkeletonHeightPx(): number {
  const subsection =
    COMMIT_FREQUENCY_SUBHEADER_H_PX +
    COMMIT_FREQUENCY_SUBHEADER_MB_PX +
    COMMIT_BAR_COMPACT_H_PX;
  const gaps = (COMMIT_FREQUENCY_SUBSECTIONS - 1) * COMMIT_FREQUENCY_SECTION_GAP_PX;
  return COMMIT_FREQUENCY_SUBSECTIONS * subsection + gaps;
}

export function commitsByHourSkeletonHeightPx(): number {
  return HOUR_CHART_PEAK_H_PX + HOUR_CHART_STRIP_H_PX + HOUR_CHART_LEGEND_H_PX;
}
