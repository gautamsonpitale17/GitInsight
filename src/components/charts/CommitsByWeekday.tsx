"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import { ChartFigure } from "@/components/accessibility/ChartFigure";
import { ChartInView } from "@/components/charts/ChartInView";
import { ChartEmptyState } from "@/components/ui/ChartEmptyState";
import { EMPTY_COPY } from "@/lib/format";
import { useCommitsByWeekdayChartHeight } from "@/hooks/useChartHeight";
import { SM_BREAKPOINT, useWindowWidth } from "@/hooks/useWindowWidth";
import { Bar } from "recharts/es6/cartesian/Bar";
import { CartesianGrid } from "recharts/es6/cartesian/CartesianGrid";
import { XAxis } from "recharts/es6/cartesian/XAxis";
import { YAxis } from "recharts/es6/cartesian/YAxis";
import { BarChart } from "recharts/es6/chart/BarChart";
import { Cell } from "recharts/es6/component/Cell";
import { ResponsiveContainer } from "recharts/es6/component/ResponsiveContainer";
import { Tooltip } from "recharts/es6/component/Tooltip";
import { colorVar } from "@/lib/theme-colors";
const BAR_RADIUS: [number, number, number, number] = [3, 3, 0, 0];
const BAR_SIZE_DESKTOP = 40;
const BAR_SIZE_COMPACT = 16;
const BAR_SIZE_MOBILE = 24;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const WEEKDAY_PLURAL = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
] as const;

export interface CommitsByWeekdayProps {
  /** Commit counts by weekday; index 0 = Sunday. */
  data: number[];
}

interface WeekdayChartPoint {
  day: string;
  count: number;
  weekday: string;
  weekdayPlural: string;
}

function normalizeWeekdayData(data: number[]): number[] {
  return Array.from({ length: 7 }, (_, index) => Math.max(0, data[index] ?? 0));
}

function findMostActiveIndex(counts: number[]): number {
  let maxIndex = 0;
  let maxCount = counts[0] ?? 0;

  for (let index = 1; index < counts.length; index += 1) {
    const count = counts[index] ?? 0;
    if (count > maxCount) {
      maxCount = count;
      maxIndex = index;
    }
  }

  return maxIndex;
}

type WeekdayTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: WeekdayChartPoint }>;
  coordinate?: { x?: number; y?: number };
  onCoordinateChange?: (coordinate: { x?: number; y?: number } | undefined) => void;
};

function WeekdayTooltipContent({
  active,
  payload,
  coordinate,
  onCoordinateChange,
}: WeekdayTooltipProps) {
  useEffect(() => {
    onCoordinateChange?.(active ? coordinate : undefined);
  }, [active, coordinate, onCoordinateChange]);

  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  const commitLabel = point.count === 1 ? "1 commit" : `${point.count} commits`;

  return (
    <div className="chart-tooltip rounded px-2 py-1.5 text-xs shadow-lg">
      {commitLabel} on {point.weekdayPlural}
    </div>
  );
}

const NARROW_TOOLTIP_OFFSET = { x: 4, y: 8 };
const NARROW_TOOLTIP_ESTIMATE_WIDTH = 148;
const NARROW_TOOLTIP_MARGIN = 4;

function clampNarrowTooltipX(
  coordinateX: number,
  chartWidth: number,
): number {
  const half = NARROW_TOOLTIP_ESTIMATE_WIDTH / 2;
  const minCenter = NARROW_TOOLTIP_MARGIN + half;
  const maxCenter = chartWidth - NARROW_TOOLTIP_MARGIN - half;
  return Math.max(minCenter, Math.min(coordinateX, maxCenter));
}

export function CommitsByWeekday({ data }: CommitsByWeekdayProps) {
  const { ref: containerRef, width: containerWidth, isNarrow: isNarrowSlot } =
    useContainerWidth();
  const [tooltipPosition, setTooltipPosition] = useState<
    { x: number } | undefined
  >();
  const chartHeight = useCommitsByWeekdayChartHeight();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < SM_BREAKPOINT;
  const isCompact = !isMobile && isNarrowSlot;

  const counts = useMemo(() => normalizeWeekdayData(data), [data]);

  const chartData = useMemo<WeekdayChartPoint[]>(
    () =>
      counts.map((count, index) => ({
        day: DAY_LABELS[index],
        count,
        weekday: WEEKDAY_NAMES[index],
        weekdayPlural: WEEKDAY_PLURAL[index],
      })),
    [counts],
  );

  const maxCount = useMemo(() => Math.max(...counts, 0), [counts]);
  const totalCount = useMemo(() => counts.reduce((sum, n) => sum + n, 0), [counts]);
  const mostActiveIndex = useMemo(() => findMostActiveIndex(counts), [counts]);
  const peakDay = WEEKDAY_NAMES[mostActiveIndex];
  const chartLabel = `Bar chart of commits by weekday. Most active on ${peakDay}.`;

  if (totalCount === 0) {
    return <ChartEmptyState message={EMPTY_COPY.commitsWeekday} />;
  }

  const maxBarSize = isMobile
    ? BAR_SIZE_MOBILE
    : isCompact
      ? BAR_SIZE_COMPACT
      : BAR_SIZE_DESKTOP;
  const hideYAxis = isMobile || isCompact;

  const handleTooltipCoordinate = useCallback(
    (coordinate: { x?: number; y?: number } | undefined) => {
      if (!isCompact || coordinate?.x == null || containerWidth <= 0) {
        setTooltipPosition(undefined);
        return;
      }
      setTooltipPosition({
        x: clampNarrowTooltipX(coordinate.x, containerWidth),
      });
    },
    [containerWidth, isCompact],
  );

  const renderTooltip = useCallback(
    (props: WeekdayTooltipProps) => (
      <WeekdayTooltipContent {...props} onCoordinateChange={handleTooltipCoordinate} />
    ),
    [handleTooltipCoordinate],
  );

  return (
    <div ref={containerRef} className="commits-weekday-chart w-full min-w-0">
      <p className="mb-2 text-xs text-gh-gray-5">
        Most active on {peakDay}
        {maxCount > 0 ? (
          <span className="text-gh-gray-6">
            {" "}
            (peak day, darker bar)
          </span>
        ) : null}
      </p>

      <ChartFigure label={chartLabel}>
      <ChartInView className="w-full">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            margin={{
              top: 4,
              right: isCompact ? 2 : 8,
              left: hideYAxis ? 0 : 4,
              bottom: 0,
            }}
          >
            <CartesianGrid stroke={colorVar.chartGrid} vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{
                fill: colorVar.fgMuted,
                fontSize: isCompact ? 10 : 12,
              }}
            />
            <YAxis
              hide={hideYAxis}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={hideYAxis ? 0 : 28}
              tick={{ fill: colorVar.fgMuted, fontSize: 12 }}
            />
            <Tooltip
              content={renderTooltip}
              cursor={{ fill: colorVar.chartCursorGreen }}
              allowEscapeViewBox={{ x: true, y: true }}
              offset={isCompact ? NARROW_TOOLTIP_OFFSET : 10}
              position={isCompact ? tooltipPosition : undefined}
              reverseDirection={
                isCompact ? { x: true, y: true } : { x: false, y: false }
              }
            />
            <Bar
              dataKey="count"
              radius={BAR_RADIUS}
              maxBarSize={maxBarSize}
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.day}
                  fill={
                    entry.count === maxCount && maxCount > 0
                      ? colorVar.accentGreenEmphasis
                      : colorVar.accentGreen
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartInView>
      </ChartFigure>
    </div>
  );
}
