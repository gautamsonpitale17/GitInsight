/** Shared contribution heatmap layout (must match `ContributionHeatmap` SVG). */

export const HEATMAP_CELL_PX = 11;
export const HEATMAP_GAP_PX = 2;
export const HEATMAP_WEEKS_DESKTOP = 52;
export const HEATMAP_DAYS = 7;
export const HEATMAP_DAY_LABEL_WIDTH_PX = 32;
export const HEATMAP_MONTH_LABEL_HEIGHT_PX = 16;

export function heatmapGridWidthPx(weeks = HEATMAP_WEEKS_DESKTOP): number {
  return weeks * HEATMAP_CELL_PX + (weeks - 1) * HEATMAP_GAP_PX;
}

export function heatmapGridHeightPx(rows = HEATMAP_DAYS): number {
  return rows * HEATMAP_CELL_PX + (rows - 1) * HEATMAP_GAP_PX;
}

export const HEATMAP_GRID_WIDTH_PX = heatmapGridWidthPx();
export const HEATMAP_GRID_HEIGHT_PX = heatmapGridHeightPx();
export const HEATMAP_SVG_WIDTH_PX =
  HEATMAP_DAY_LABEL_WIDTH_PX + HEATMAP_GRID_WIDTH_PX;
export const HEATMAP_SVG_HEIGHT_PX =
  HEATMAP_MONTH_LABEL_HEIGHT_PX + HEATMAP_GRID_HEIGHT_PX;

/** Year tabs + summary + SVG + legend (desktop loading placeholder). */
export const HEATMAP_SECTION_SKELETON_H_PX =
  28 + 32 + HEATMAP_SVG_HEIGHT_PX + 36;
