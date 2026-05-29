import type { HeatmapLevel } from "@/types/github";

/** CSS custom property references for theme-aware styling. */
export const colorVar = {
  canvasDefault: "var(--color-canvas-default)",
  canvasSubtle: "var(--color-canvas-subtle)",
  borderDefault: "var(--color-border-default)",
  fgDefault: "var(--color-fg-default)",
  fgMuted: "var(--color-fg-muted)",
  chartGrid: "var(--color-chart-grid)",
  chartAxis: "var(--color-chart-axis)",
  chartTooltipBg: "var(--color-chart-tooltip-bg)",
  chartTooltipFg: "var(--color-chart-tooltip-fg)",
  chartCursor: "var(--color-chart-cursor)",
  chartCursorGreen: "var(--color-chart-cursor-green)",
  chartCursorBlue: "var(--color-chart-cursor-blue)",
  chartSliceStroke: "var(--color-chart-slice-stroke)",
  sparklineDotStroke: "var(--color-sparkline-dot-stroke)",
  accentGreen: "var(--color-accent-green)",
  accentGreenEmphasis: "var(--color-accent-green-emphasis)",
  accentGreenSubtle: "var(--color-accent-green-subtle)",
  heatmapSeparator: "var(--color-heatmap-separator)",
  heatmapCurrentWeekRing: "var(--color-heatmap-current-week-ring)",
  insightPositiveBorder: "var(--color-insight-positive-border)",
  insightPositiveBg: "var(--color-insight-positive-bg)",
  insightTipBg: "var(--color-insight-tip-bg)",
  languageFallback: "var(--color-language-fallback)",
  alertBorder: "var(--color-alert-border)",
  alertBg: "var(--color-alert-bg)",
  alertFg: "var(--color-alert-fg)",
  badgeLegendBorder: "var(--color-badge-legend-border)",
  badgeLegendBg: "var(--color-badge-legend-bg)",
  badgeLegendFg: "var(--color-badge-legend-fg)",
} as const;

export function heatmapLevelVar(level: HeatmapLevel): string {
  return `var(--color-heatmap-${level})`;
}

export function heatmapCurrentWeekVar(level: HeatmapLevel): string {
  return `var(--color-heatmap-current-${level})`;
}

/** Read a resolved CSS variable value from the document root (client-only). */
export function readCssVariable(variableName: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  return value || fallback;
}
