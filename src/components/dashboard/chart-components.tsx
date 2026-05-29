"use client";

import dynamic from "next/dynamic";
import {
  COMMITS_BY_WEEKDAY_CHART_H_PX,
  HeatmapChartSkeleton,
} from "@/components/dashboard/skeletons";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { commitsByHourSkeletonHeightPx } from "@/lib/skeleton-dimensions";

export const LazyActivityTimeline = dynamic(
  () =>
    import("@/components/dashboard/ActivityTimeline").then(
      (mod) => mod.ActivityTimeline,
    ),
  { ssr: false, loading: () => <SkeletonBox h={240} /> },
);

export const LazyContributionHeatmap = dynamic(
  () =>
    import("@/components/charts/ContributionHeatmap").then(
      (mod) => mod.ContributionHeatmap,
    ),
  { ssr: false, loading: () => <HeatmapChartSkeleton /> },
);

export const LazyCommitsByWeekday = dynamic(
  () =>
    import("@/components/charts/CommitsByWeekday").then((mod) => mod.CommitsByWeekday),
  { ssr: false, loading: () => <SkeletonBox h={COMMITS_BY_WEEKDAY_CHART_H_PX} /> },
);

export const LazyCommitsByHour = dynamic(
  () => import("@/components/charts/CommitsByHour").then((mod) => mod.CommitsByHour),
  { ssr: false, loading: () => <SkeletonBox h={commitsByHourSkeletonHeightPx()} /> },
);
