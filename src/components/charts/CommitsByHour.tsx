"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import { createPortal } from "react-dom";
import { HeatmapLevelLegend } from "@/components/accessibility/HeatmapLevelLegend";
import { ChartEmptyState } from "@/components/ui/ChartEmptyState";
import { EMPTY_COPY } from "@/lib/format";
import { getClampedTooltipPosition } from "@/lib/tooltip-position";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { heatmapLevelVar } from "@/lib/theme-colors";
import type { HeatmapLevel } from "@/types/github";

const HOURS = 24;
const CELL_HEIGHT = 28;

const LABEL_ROW_HEIGHT = 16;
const CHART_TOP = 0;

/** Fixed SVG coordinate space; rendered width scales to 100% of the container. */
const VIEWBOX_WIDTH = 360;
const VIEWBOX_HEIGHT = CHART_TOP + CELL_HEIGHT + LABEL_ROW_HEIGHT;
const CELL_WIDTH = VIEWBOX_WIDTH / HOURS;

const HOUR_TICKS_DEFAULT: { hour: number; label: string }[] = [
  { hour: 0, label: "12am" },
  { hour: 6, label: "6am" },
  { hour: 12, label: "12pm" },
  { hour: 18, label: "6pm" },
];

/** Six labels for ~212px narrow dashboard slots. */
const HOUR_TICKS_NARROW: { hour: number; label: string }[] = [
  { hour: 0, label: "12am" },
  { hour: 4, label: "4am" },
  { hour: 8, label: "8am" },
  { hour: 12, label: "12pm" },
  { hour: 16, label: "4pm" },
  { hour: 20, label: "8pm" },
];

export interface CommitsByHourProps {
  /** Commit counts by hour; index 0 = midnight (0:00). */
  data: number[];
}

interface HourCell {
  hour: number;
  count: number;
  level: HeatmapLevel;
}

interface TooltipState {
  cell: HourCell;
  left: number;
  top: number;
  transform: string;
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

function normalizeHourData(data: number[]): number[] {
  return Array.from({ length: HOURS }, (_, index) => Math.max(0, data[index] ?? 0));
}

function findPeakHour(counts: number[]): number {
  let peakHour = 0;
  let peakCount = counts[0] ?? 0;

  for (let hour = 1; hour < counts.length; hour += 1) {
    const count = counts[hour] ?? 0;
    if (count > peakCount) {
      peakCount = count;
      peakHour = hour;
    }
  }

  return peakHour;
}

function formatHourRange(hour: number): string {
  const endHour = (hour + 1) % HOURS;
  return `${hour}:00–${endHour}:00`;
}

function formatTooltip(hour: number, count: number): string {
  const commitLabel = count === 1 ? "1 commit" : `${count} commits`;
  return `${commitLabel} at ${hour}:00`;
}

function HourTooltip({
  cell,
  left,
  top,
  transform,
  visible,
}: {
  cell: HourCell;
  left: number;
  top: number;
  transform: string;
  visible: boolean;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="tooltip"
      className="chart-tooltip pointer-events-none fixed z-[100] rounded px-2 py-1.5 text-xs whitespace-nowrap shadow-lg transition-opacity duration-100"
      style={{
        left,
        top,
        transform,
        opacity: visible ? 1 : 0,
      }}
    >
      {formatTooltip(cell.hour, cell.count)}
    </div>,
    document.body,
  );
}

export function CommitsByHour({ data }: CommitsByHourProps) {
  const { ref: containerRef, isNarrow } = useContainerWidth();
  const isInView = useInView(containerRef);
  const hourTicks = isNarrow ? HOUR_TICKS_NARROW : HOUR_TICKS_DEFAULT;
  const prefersReducedMotion = usePrefersReducedMotion();
  const useCellAnimation = !prefersReducedMotion;

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counts = useMemo(() => normalizeHourData(data), [data]);
  const cells = useMemo<HourCell[]>(
    () =>
      counts.map((count, hour) => ({
        hour,
        count,
        level: getHeatmapLevel(count),
      })),
    [counts],
  );

  const peakHour = useMemo(() => findPeakHour(counts), [counts]);
  const totalCount = useMemo(() => counts.reduce((sum, n) => sum + n, 0), [counts]);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleCellMouseEnter = useCallback(
    (event: React.MouseEvent<SVGRectElement>, cell: HourCell) => {
      clearHideTimeout();
      const position = getClampedTooltipPosition(event.currentTarget.getBoundingClientRect());
      setTooltip({
        cell,
        left: position.left,
        top: position.top,
        transform: position.transform,
      });
      setTooltipVisible(true);
    },
    [clearHideTimeout],
  );

  const handleCellMouseLeave = useCallback(() => {
    setTooltipVisible(false);
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setTooltip(null);
      hideTimeoutRef.current = null;
    }, 100);
  }, [clearHideTimeout]);

  useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);

  if (totalCount === 0) {
    return <ChartEmptyState message={EMPTY_COPY.commitsHour} />;
  }

  return (
    <div className="w-full max-w-full">
      <p className="mb-2 text-xs text-fg-muted">
        Peak coding time: {formatHourRange(peakHour)}
      </p>

      <div ref={containerRef} className="relative w-full" data-hour-chart>
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          width="100%"
          role="img"
          aria-label={`Commit activity by hour of day. Peak at ${formatHourRange(peakHour)}.`}
          className="block h-auto w-full overflow-visible"
          preserveAspectRatio="xMidYMin meet"
        >
          {cells.map((cell) => (
            <rect
              key={cell.hour}
              x={cell.hour * CELL_WIDTH}
              y={CHART_TOP}
              width={CELL_WIDTH}
              height={CELL_HEIGHT}
              rx={2}
              ry={2}
              fill={heatmapLevelVar(cell.level)}
              className={
                useCellAnimation
                  ? `heatmap-cell-enter${isInView ? " is-inview" : ""}`
                  : undefined
              }
              style={
                useCellAnimation
                  ? { animationDelay: `${cell.hour * 10}ms` }
                  : undefined
              }
              aria-label={formatTooltip(cell.hour, cell.count)}
              onMouseEnter={(event) => handleCellMouseEnter(event, cell)}
              onMouseLeave={handleCellMouseLeave}
            />
          ))}

          {hourTicks.map(({ hour, label }) => (
            <text
              key={`${hour}-${label}`}
              x={hour * CELL_WIDTH + CELL_WIDTH / 2}
              y={CHART_TOP + CELL_HEIGHT + 12}
              textAnchor="middle"
              className="fill-fg-muted"
              fontSize={isNarrow ? 10 : 12}
            >
              {label}
            </text>
          ))}
        </svg>

        {tooltip ? (
          <HourTooltip
            cell={tooltip.cell}
            left={tooltip.left}
            top={tooltip.top}
            transform={tooltip.transform}
            visible={tooltipVisible}
          />
        ) : null}
      </div>

      <HeatmapLevelLegend variant="activity" />
    </div>
  );
}
