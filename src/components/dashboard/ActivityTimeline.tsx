"use client";

import CircleDot from "lucide-react/dist/esm/icons/circle-dot.mjs";
import GitCommit from "lucide-react/dist/esm/icons/git-commit.mjs";
import GitFork from "lucide-react/dist/esm/icons/git-fork.mjs";
import GitPullRequest from "lucide-react/dist/esm/icons/git-pull-request.mjs";
import Star from "lucide-react/dist/esm/icons/star.mjs";
import Tag from "lucide-react/dist/esm/icons/tag.mjs";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChartEmptyState, InboxEmptyIcon } from "@/components/ui/ChartEmptyState";
import { groupActivitiesByDate } from "@/lib/activity-grouping";
import {
  EMPTY_COPY,
  formatActivityDateHeading,
  formatRelativeTime,
} from "@/lib/format";
import { StickyActivityDateHeader } from "@/components/dashboard/StickyActivityDateHeader";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { ActivityItem, ActivityType } from "@/types/github";

const INITIAL_VISIBLE = 15;
const LOAD_MORE_STEP = 10;
const TIMELINE_STAGGER_MS = 50;

type ActivityTimelineProps = {
  activities: ActivityItem[];
};

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  push: GitCommit,
  pr: GitPullRequest,
  issue: CircleDot,
  create: Tag,
  star: Star,
  fork: GitFork,
};

function getRepoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef);
  const prefersReducedMotion = usePrefersReducedMotion();
  const useItemAnimation = !prefersReducedMotion;

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    const expandForPrint = () => setVisibleCount(activities.length);
    const restoreAfterPrint = () => setVisibleCount(INITIAL_VISIBLE);

    window.addEventListener("beforeprint", expandForPrint);
    window.addEventListener("afterprint", restoreAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", expandForPrint);
      window.removeEventListener("afterprint", restoreAfterPrint);
    };
  }, [activities.length]);

  const visibleActivities = activities.slice(0, visibleCount);
  const hasMore = visibleCount < activities.length;

  // client-safe: groupActivitiesByDate
  const groupedByDate = useMemo(
    () => groupActivitiesByDate(visibleActivities),
    [visibleActivities],
  );

  const dateKeys = useMemo(
    () => Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)),
    [groupedByDate],
  );

  if (activities.length === 0) {
    return (
      <ChartEmptyState
        icon={<InboxEmptyIcon />}
        message={EMPTY_COPY.activity}
      />
    );
  }

  let itemIndex = 0;

  return (
    <div ref={containerRef} className="space-y-6">
      {dateKeys.map((dateKey) => {
        const dayItems = groupedByDate[dateKey] ?? [];

        return (
          <section key={dateKey}>
            <StickyActivityDateHeader>
              {formatActivityDateHeading(dateKey)}
            </StickyActivityDateHeader>
            <ul className="mt-2 divide-y divide-gh-gray-2" role="list">
              {dayItems.map((item) => {
                const Icon = ACTIVITY_ICONS[item.type] ?? GitCommit;
                const staggerIndex = itemIndex;
                itemIndex += 1;

                return (
                  <li
                    key={item.id}
                    className={[
                      "first:pt-2",
                      useItemAnimation
                        ? `timeline-item-enter${isInView ? " is-inview" : ""}`
                        : undefined,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      useItemAnimation
                        ? { animationDelay: `${staggerIndex * TIMELINE_STAGGER_MS}ms` }
                        : undefined
                    }
                  >
                    <div
                      role="listitem"
                      tabIndex={0}
                      className="-mx-4 flex min-w-0 flex-col gap-1 px-4 py-2 transition-[background-color] duration-gh ease hover:bg-[var(--color-canvas-subtle)] focus-visible:bg-[var(--color-canvas-subtle)] sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3"
                    >
                      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gh-gray-0 text-gh-gray-5">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm text-gh-gray-7">
                            {item.description}
                          </p>
                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <a
                              href={getRepoUrl(item.repo)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gh-link min-w-0 truncate font-mono text-xs"
                            >
                              {item.repo}
                            </a>
                            <time
                              className="gh-stat-number shrink-0 text-xs text-gh-gray-5 sm:hidden"
                              dateTime={item.createdAt}
                              title={formatRelativeTime(item.createdAt)}
                            >
                              · {formatRelativeTime(item.createdAt)}
                            </time>
                          </div>
                        </div>
                      </div>
                      <time
                        className="gh-stat-number hidden shrink-0 text-right text-xs text-gh-gray-5 sm:block"
                        dateTime={item.createdAt}
                        title={formatRelativeTime(item.createdAt)}
                      >
                        {formatRelativeTime(item.createdAt)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {hasMore ? (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
          className="no-print gh-btn gh-btn-secondary tap-target-mobile w-full px-4 py-2 text-sm text-gh-gray-6 shadow-sm"
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}
