"use client";

import { LG_BREAKPOINT, useWindowWidth } from "@/hooks/useWindowWidth";

type ChartHeightOptions = {
  /** Height below `lg` (viewport under 1024px). */
  mobile: number;
  /** Height at `lg` and above. */
  lg: number;
};

/**
 * Returns a chart height in px for the current viewport.
 * Use the result on `ResponsiveContainer` (not a hard-coded literal) so charts
 * can resize when breakpoints change.
 */
export function useChartHeight({ mobile, lg }: ChartHeightOptions): number {
  const width = useWindowWidth();
  return width >= LG_BREAKPOINT ? lg : mobile;
}

/** Commits-by-weekday bar chart: 160px mobile, 200px on lg+. */
export function useCommitsByWeekdayChartHeight(): number {
  return useChartHeight({ mobile: 160, lg: 200 });
}
