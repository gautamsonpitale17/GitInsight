"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { HeatmapChartSkeleton } from "@/components/dashboard/skeletons";
import { SectionMessage } from "@/components/dashboard/SectionMessage";
import { GitHubAvatar } from "@/components/ui/GitHubAvatar";
import type { ContributionsPayload } from "@/lib/contributions";
import { ghBtnSecondary } from "@/lib/interactive-classes";
import { cn } from "@/lib/utils";

const LazyContributionHeatmap = dynamic(
  () =>
    import("@/components/charts/ContributionHeatmap").then((mod) => mod.ContributionHeatmap),
  { ssr: false, loading: () => <HeatmapChartSkeleton /> },
);

/** Revalidate live contribution data every five minutes. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
/** Minimum time between focus-triggered refreshes. */
const FOCUS_REFRESH_COOLDOWN_MS = 30_000;

type PortfolioContributionHeatmapProps = {
  username: string;
  initialPayload: ContributionsPayload | null;
};

async function fetchContributions(username: string): Promise<ContributionsPayload> {
  const response = await fetch(
    `/api/github/contributions?username=${encodeURIComponent(username)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Unable to load contributions (${response.status})`);
  }

  return response.json() as Promise<ContributionsPayload>;
}

export function PortfolioContributionHeatmap({
  username,
  initialPayload,
}: PortfolioContributionHeatmapProps) {
  const [payload, setPayload] = useState<ContributionsPayload | null>(initialPayload);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const lastFocusRefreshRef = useRef(0);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    startRefresh(async () => {
      try {
        const next = await fetchContributions(username);
        if (!mountedRef.current) {
          return;
        }
        setPayload(next);
        setError(null);
      } catch (refreshError) {
        if (!mountedRef.current) {
          return;
        }
        const message =
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to refresh contribution data";
        setError(message);
      }
    });
  }, [username]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialPayload) {
      return;
    }
    refresh();
  }, [initialPayload, refresh]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      if (now - lastFocusRefreshRef.current < FOCUS_REFRESH_COOLDOWN_MS) {
        return;
      }

      lastFocusRefreshRef.current = now;
      refresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refresh]);

  const hasData = Boolean(
    payload?.rollingYear?.heatmap?.length ||
      (payload?.heatmapByYear && payload.years.length > 0),
  );
  const isLoading = !hasData && !error && (isRefreshing || !initialPayload);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <GitHubAvatar login={username} size={40} sizes="40px" priority />
          <div className="min-w-0 text-left">
            <Link
              href={`/${username}?tab=commits`}
              className="gh-link truncate text-base font-semibold text-gh-gray-7"
            >
              @{username}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${username}?tab=commits`}
            className={cn(
              ghBtnSecondary,
              "tap-target-mobile rounded-full px-3 py-1.5 text-sm font-medium text-gh-gray-6",
            )}
          >
            Full dashboard
          </Link>
        </div>
      </div>

      {error ? <SectionMessage message={error} variant="error" /> : null}

      {isLoading ? (
        <HeatmapChartSkeleton />
      ) : hasData ? (
        <LazyContributionHeatmap
          cells={[]}
          officialHeatmapByYear={payload!.heatmapByYear}
          yearOptions={payload!.years}
          contributionTotalsByYear={payload!.totalsByYear}
          rollingYearContributions={payload!.rollingYear}
          scrollContained={true}
        />
      ) : !error ? (
        <SectionMessage message="No contribution data available for this account." variant="empty" />
      ) : null}
    </div>
  );
}
