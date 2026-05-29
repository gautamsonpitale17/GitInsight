import type { ReactNode } from "react";
import { StreakTimeline } from "@/components/charts/StreakTimeline";
import { Card } from "@/components/ui/Card";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_GRID_STREAK_CLASS,
} from "@/components/dashboard/metric-card-styles";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";
import type { StreakData } from "@/types/github";

const ACTIVE_DAYS_YEAR = 365;

type StreakStatsProps = {
  data: StreakData;
};

type StreakMetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  suffix?: string;
  valueClassName?: string;
  cardClassName?: string;
  children?: ReactNode;
};

function StreakMetricCard({
  label,
  value,
  suffix,
  valueClassName,
  cardClassName,
  children,
}: StreakMetricCardProps) {
  return (
    <Card
      as="article"
      noBorder
      padding="none"
      className={cn(DASHBOARD_METRIC_CARD_CLASS, cardClassName)}
    >
      <p className="text-sm text-gh-gray-5">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span
          className={cn(
            "streak-stat-value gh-stat-number font-semibold text-gh-gray-7",
            valueClassName,
          )}
        >
          {value}
        </span>
        {suffix ? <span className="text-sm text-gh-gray-5">{suffix}</span> : null}
      </p>
      {children}
    </Card>
  );
}

function toUTCDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function wasActiveToday(lastActive: string): boolean {
  if (!lastActive) {
    return false;
  }

  return lastActive === toUTCDateKey(new Date());
}

export function StreakStats({ data }: StreakStatsProps) {
  const activeDaysPercent = Math.min(
    100,
    (data.totalActiveDays / ACTIVE_DAYS_YEAR) * 100,
  );
  const showNudge = data.current === 0 && !wasActiveToday(data.lastActive);
  const isActiveStreak = data.current > 0;

  return (
    <div className="streak-stats w-full min-w-0">
      <div className={DASHBOARD_METRIC_GRID_STREAK_CLASS}>
        <StreakMetricCard
          label={
            <>
              {isActiveStreak ? <span aria-hidden>🔥 </span> : null}
              Current streak
            </>
          }
          value={formatCount(data.current)}
          suffix="days"
          valueClassName={isActiveStreak ? "font-bold text-gh-green-text" : "text-gh-gray-5"}
          cardClassName={cn(
            isActiveStreak &&
              "bg-gradient-to-br from-gh-green-light/80 to-[var(--color-canvas-subtle)] ring-2 ring-gh-green/35 stat-streak-active hover:from-gh-green-light hover:shadow-md",
          )}
        />

        <StreakMetricCard
          label={
            <>
              <span aria-hidden>⚡ </span>
              Longest streak
            </>
          }
          value={formatCount(data.longest)}
          suffix="days"
        />

        <StreakMetricCard
          label={
            <>
              <span aria-hidden>📅 </span>
              Active days
            </>
          }
          value={
            <>
              {formatCount(data.totalActiveDays)}
              <span className="text-sm font-normal text-gh-gray-5">/{ACTIVE_DAYS_YEAR}</span>
            </>
          }
          valueClassName="inline-flex flex-wrap items-baseline gap-1"
        >
          <div
            className="streak-progress mt-3 h-1 w-full overflow-hidden rounded-full bg-gh-gray-1"
            role="progressbar"
            aria-valuenow={data.totalActiveDays}
            aria-valuemin={0}
            aria-valuemax={ACTIVE_DAYS_YEAR}
            aria-label={`${data.totalActiveDays} active days in the last year`}
          >
            <div
              className="h-full rounded-full bg-gh-green transition-[width]"
              style={{ width: `${activeDaysPercent}%` }}
              aria-hidden
            />
          </div>
          <p className="mt-1.5 text-xs leading-snug text-gh-gray-5">
            <span className="gh-stat-number">{Math.round(activeDaysPercent)}</span>% active in the
            last year
          </p>
        </StreakMetricCard>
      </div>

      {data.timeline && data.timeline.length > 0 ? (
        <div className="streak-timeline-section mt-6 border-t border-gh-gray-2 pt-5">
          <StreakTimeline data={data.timeline} />
        </div>
      ) : null}

      {showNudge ? (
        <p className="mt-6 max-w-full rounded-md border border-gh-gray-2 bg-gh-gray-0 px-3 py-2 text-sm text-gh-gray-6">
          Push something today!
        </p>
      ) : null}
    </div>
  );
}
