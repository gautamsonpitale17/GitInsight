import type { HeatmapCell, HeatmapLevel } from "@/types/github";

/** GitHub-style contribution colors (light theme). */
export const OG_HEATMAP_COLORS: Record<HeatmapLevel, string> = {
  0: "#ebedf0",
  1: "#9be9a8",
  2: "#40c463",
  3: "#30a14e",
  4: "#216e39",
};

const PREVIEW_WEEKS = 12;
const PREVIEW_DAYS = 7;

/**
 * Last 12 weeks × 7 days from a 7×N heatmap grid (day rows, week columns).
 */
export function buildHeatmapPreview(grid: HeatmapCell[][] | undefined): HeatmapLevel[][] {
  const empty = Array.from({ length: PREVIEW_DAYS }, () =>
    Array.from({ length: PREVIEW_WEEKS }, () => 0 as HeatmapLevel),
  );

  if (!grid?.length || !grid[0]?.length) {
    return empty;
  }

  const weekCount = grid[0].length;
  const startWeek = Math.max(0, weekCount - PREVIEW_WEEKS);

  return Array.from({ length: PREVIEW_DAYS }, (_, day) =>
    Array.from({ length: PREVIEW_WEEKS }, (_, weekIndex) => {
      const week = startWeek + weekIndex;
      return grid[day]?.[week]?.level ?? 0;
    }),
  );
}
