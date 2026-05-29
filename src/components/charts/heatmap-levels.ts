import type { HeatmapLevel } from "@/types/github";
import { heatmapLevelVar } from "@/lib/theme-colors";

export {
  HEATMAP_CELL_PX,
  HEATMAP_DAYS,
  HEATMAP_DAY_LABEL_WIDTH_PX,
  HEATMAP_GAP_PX,
  HEATMAP_GRID_HEIGHT_PX,
  HEATMAP_GRID_WIDTH_PX,
  HEATMAP_MONTH_LABEL_HEIGHT_PX,
  HEATMAP_SVG_HEIGHT_PX,
  HEATMAP_SVG_WIDTH_PX,
  HEATMAP_WEEKS_DESKTOP,
} from "@/components/charts/heatmap-layout";

const HEATMAP_LEVEL_CLASSES: Record<HeatmapLevel, string> = {
  0: "bg-[var(--color-heatmap-0)]",
  1: "bg-[var(--color-heatmap-1)]",
  2: "bg-[var(--color-heatmap-2)]",
  3: "bg-[var(--color-heatmap-3)]",
  4: "bg-[var(--color-heatmap-4)]",
};

export function getHeatmapLevelClass(level: HeatmapLevel): string {
  return HEATMAP_LEVEL_CLASSES[level];
}

export function getHeatmapLevelFill(level: HeatmapLevel): string {
  return heatmapLevelVar(level);
}
