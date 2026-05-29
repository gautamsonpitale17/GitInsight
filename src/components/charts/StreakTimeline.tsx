"use client";

import { useMemo } from "react";
import Flame from "lucide-react/dist/esm/icons/flame.mjs";
import { Area } from "recharts/es6/cartesian/Area";
import { AreaChart } from "recharts/es6/chart/AreaChart";
import { ResponsiveContainer } from "recharts/es6/component/ResponsiveContainer";
import { Tooltip } from "recharts/es6/component/Tooltip";
import { ChartFigure } from "@/components/accessibility/ChartFigure";
import { useChartInView } from "@/components/charts/ChartInView";
import { ChartEmptyState } from "@/components/ui/ChartEmptyState";
import { STREAK_TIMELINE_DAYS } from "@/lib/streak-timeline";
import { EMPTY_COPY, formatCount, formatDateKey, formatDisplayDate } from "@/lib/format";
import { colorVar } from "@/lib/theme-colors";
import type { StreakTimelinePoint } from "@/types/github";

const TIMELINE_HEIGHT = 80;
const LINE_WIDTH = 1.5;

type StreakTimelineProps = {
  data: StreakTimelinePoint[];
};

type ChartPoint = StreakTimelinePoint & {
  tooltipDate: string;
};

function formatTimelineDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return dateKey;
  }
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return formatDisplayDate(date);
}

type TimelineTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartPoint }>;
};

function TimelineTooltip({ active, payload }: TimelineTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded border border-gh-gray-2 bg-gh-surface px-2 py-1 text-xs shadow-sm">
      <p className="text-gh-gray-5">{point.tooltipDate}</p>
      {point.active ? (
        <p className="font-medium text-gh-gray-7">
          <span className="gh-stat-number">{formatCount(point.streakLength)}</span>
          -day streak
          {point.inCurrentStreak ? (
            <span className="ml-1 text-gh-green-text">· current</span>
          ) : null}
        </p>
      ) : (
        <p className="font-medium text-gh-gray-6">No push activity</p>
      )}
    </div>
  );
}

export function StreakTimeline({ data }: StreakTimelineProps) {
  const { ref, isInView, prefersReducedMotion, animate } = useChartInView();

  const chartData = useMemo<ChartPoint[]>(
    () =>
      data.map((entry) => ({
        ...entry,
        tooltipDate: formatTimelineDate(entry.date),
      })),
    [data],
  );

  const hasActivity = chartData.some((point) => point.active);
  const peakStreak = chartData.reduce(
    (max, point) => Math.max(max, point.streakLength),
    0,
  );
  const firstLabel = data[0] ? formatDateKey(data[0].date) : "";
  const lastLabel = data.length > 0 ? formatDateKey(data[data.length - 1].date) : "";
  const chartLabel = hasActivity
    ? `Streak timeline for the last ${STREAK_TIMELINE_DAYS} days. Longest streak in this window: ${formatCount(peakStreak)} days.`
    : `Streak timeline for the last ${STREAK_TIMELINE_DAYS} days. No push activity in this window.`;

  if (!hasActivity) {
    return (
      <ChartEmptyState
        icon={<Flame strokeWidth={1.5} />}
        message={EMPTY_COPY.streakTimeline}
      />
    );
  }

  return (
    <div className="streak-timeline w-full min-w-0">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gh-gray-5">
        Streak timeline
        <span className="sr-only">, last {STREAK_TIMELINE_DAYS} days</span>
      </p>
      <ChartFigure
        label={chartLabel}
        className={[
          "w-full min-w-0 max-w-full",
          !prefersReducedMotion ? `chart-fade-enter${isInView ? " is-inview" : ""}` : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          ref={ref}
          className="streak-timeline__chart w-full min-w-0"
          style={{ height: TIMELINE_HEIGHT }}
        >
          {isInView ? (
            <ResponsiveContainer width="100%" height={TIMELINE_HEIGHT} minWidth={0}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <Tooltip
                  content={<TimelineTooltip />}
                  cursor={{
                    stroke: colorVar.chartCursorGreen,
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                  isAnimationActive={animate}
                />
                <Area
                  type="stepAfter"
                  dataKey="streakLength"
                  stroke={colorVar.accentGreen}
                  strokeWidth={LINE_WIDTH}
                  fill={colorVar.accentGreenSubtle}
                  fillOpacity={1}
                  dot={false}
                  activeDot={{
                    r: 3,
                    fill: colorVar.accentGreenEmphasis,
                    stroke: colorVar.sparklineDotStroke,
                    strokeWidth: 2,
                  }}
                  isAnimationActive={animate}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div aria-hidden style={{ height: TIMELINE_HEIGHT }} />
          )}
        </div>
        <div className="mt-1 flex justify-between text-xs text-gh-gray-5">
          <span>{firstLabel}</span>
          <span className="text-gh-gray-6">
            Peak{" "}
            <span className="gh-stat-number font-medium text-gh-gray-7">
              {formatCount(peakStreak)}
            </span>{" "}
            days
          </span>
          <span>{lastLabel}</span>
        </div>
      </ChartFigure>
    </div>
  );
}
