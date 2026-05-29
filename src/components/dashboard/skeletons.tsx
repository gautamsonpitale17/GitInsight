import Image from "next/image";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3.mjs";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.mjs";
import Flame from "lucide-react/dist/esm/icons/flame.mjs";
import FolderGit2 from "lucide-react/dist/esm/icons/folder-git-2.mjs";
import GitBranch from "lucide-react/dist/esm/icons/git-branch.mjs";
import {
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
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { Shimmer } from "@/components/ui/Shimmer";
import {
  avatarAlt,
  getAvatarBlurUrl,
  getGithubAvatarUrl,
  PROFILE_SIDEBAR_AVATAR_SIZES,
} from "@/lib/avatar";
import {
  ACTIVITY_DESC_H_PX,
  ACTIVITY_HEADING_H_PX,
  ACTIVITY_ICON_PX,
  ACTIVITY_LINE_WIDTHS,
  ACTIVITY_REPO_H_PX,
  ACTIVITY_ROW_PY_PX,
  ACTIVITY_SKELETON_ROWS,
  COMMIT_BAR_COMPACT_H_PX,
  COMMIT_FREQUENCY_SUBHEADER_H_PX,
  COMMIT_FREQUENCY_SUBHEADER_MB_PX,
  COMMIT_FREQUENCY_SUBSECTIONS,
  COMMIT_FREQUENCY_SECTION_GAP_PX,
  commitFrequencySkeletonHeightPx,
  HEADER_AVATAR_PX,
  HEADER_LOGIN_H_PX,
  HEADER_SEARCH_H_PX,
  REPO_DESC_WIDTHS,
  REPO_ROW_DESC_H_PX,
  REPO_ROW_META_H_PX,
  REPO_ROW_TITLE_H_PX,
  REPO_ROW_UPDATED_H_PX,
  REPO_TITLE_WIDTHS,
  SIDEBAR_AVATAR_PX,
  SIDEBAR_COMPACT_AVATAR_PX,
  SIDEBAR_BIO_LINE_H_PX,
  SIDEBAR_GITHUB_BTN_H_PX,
  SIDEBAR_HANDLE_H_PX,
  SIDEBAR_META_ROW_H_PX,
  SIDEBAR_NAME_H_PX,
  SIDEBAR_STATS_ROW_H_PX,
  STAT_CARD_ICON_PX,
  STAT_CARD_LABEL_H_PX,
  STAT_CARD_VALUE_H_PX,
  STREAK_ACTIVE_VALUE_H_PX,
  STREAK_CAPTION_H_PX,
  STREAK_CURRENT_VALUE_H_PX,
  STREAK_LABEL_H_PX,
  STREAK_PROGRESS_H_PX,
  STREAK_TIMELINE_CHART_H_PX,
} from "@/lib/skeleton-dimensions";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_GRID_REPOS_CLASS,
  DASHBOARD_METRIC_GRID_STREAK_CLASS,
} from "@/components/dashboard/metric-card-styles";
import { cn } from "@/lib/utils";

const HEATMAP_CELL_COUNT = HEATMAP_WEEKS_DESKTOP * HEATMAP_DAYS;

export function GridCell({
  className,
  children,
  narrow,
  wide,
}: {
  className?: string;
  children: React.ReactNode;
  /** 1/3 dashboard grid slot (~212px at 1012px); enables compact card layout. */
  narrow?: boolean;
  /** 2/3 dashboard grid slot (~456px at 1012px); enables wide card container queries. */
  wide?: boolean;
}) {
  return (
    <Card
      className={cn("print-section", className)}
      padding="md"
      {...(narrow ? { "data-narrow": "" } : {})}
      {...(wide ? { "data-wide": "" } : {})}
    >
      {children}
    </Card>
  );
}

export function MobileProfileSidebarStripSkeleton() {
  return (
    <div className="profile-sidebar-mobile mb-4 md:hidden" aria-hidden>
      <Card className="profile-sidebar-mobile-strip" padding="sm">
      <Shimmer
        className="rounded-full"
        style={{ width: SIDEBAR_COMPACT_AVATAR_PX, height: SIDEBAR_COMPACT_AVATAR_PX }}
      />
      <div className="profile-sidebar-mobile-identity min-w-0 flex-1 space-y-1">
        <Shimmer className="rounded-md" style={{ height: 15, width: "70%" }} />
        <Shimmer className="rounded-md" style={{ height: 14, width: "45%" }} />
      </div>
      <Shimmer className="shrink-0 rounded-md" style={{ height: 14, width: 72 }} />
      </Card>
    </div>
  );
}

export function ProfileDetailsSkeleton() {
  return (
    <div className="profile-sidebar-details" aria-hidden>
      <div className="profile-sidebar-identity">
        <Shimmer
          className="rounded-md"
          style={{ height: SIDEBAR_NAME_H_PX, width: "80%" }}
        />
        <Shimmer
          className="mt-1 rounded-md"
          style={{ height: SIDEBAR_HANDLE_H_PX, width: "55%" }}
        />
      </div>
      <div className="profile-sidebar-bio space-y-2">
        <Shimmer className="w-full rounded-md" style={{ height: SIDEBAR_BIO_LINE_H_PX }} />
        <Shimmer className="w-4/5 rounded-md" style={{ height: SIDEBAR_BIO_LINE_H_PX }} />
      </div>
      <Shimmer className="w-48 rounded-md" style={{ height: SIDEBAR_STATS_ROW_H_PX }} />
      <ul className="profile-sidebar-link-list">
        <li>
          <Shimmer className="w-56 rounded-md" style={{ height: SIDEBAR_META_ROW_H_PX }} />
        </li>
        <li>
          <Shimmer className="w-40 rounded-md" style={{ height: SIDEBAR_META_ROW_H_PX }} />
        </li>
      </ul>
      <Shimmer
        className="profile-sidebar-github-btn w-full rounded-md"
        style={{ height: SIDEBAR_GITHUB_BTN_H_PX }}
      />
    </div>
  );
}

export function SidebarSkeleton({ username }: { username?: string }) {
  const avatarUrl = username ? getGithubAvatarUrl(username, 128) : null;

  return (
    <aside className="dashboard-sidebar hidden md:block">
      <div className="profile-sidebar-panel">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={username ? avatarAlt(username) : "Profile avatar"}
            width={SIDEBAR_AVATAR_PX}
            height={SIDEBAR_AVATAR_PX}
            sizes={PROFILE_SIDEBAR_AVATAR_SIZES}
            priority
            placeholder="blur"
            blurDataURL={getAvatarBlurUrl(avatarUrl)}
            className="profile-sidebar-avatar"
          />
        ) : (
          <Shimmer className="profile-sidebar-avatar rounded-full" />
        )}
        <ProfileDetailsSkeleton />
      </div>
    </aside>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card
          key={index}
          as="article"
          padding="none"
          className="min-w-0 max-w-full overflow-hidden py-3 px-4 lg:py-4"
          aria-hidden
        >
          <div className="relative min-w-0">
            <Shimmer
              className="absolute right-0 top-0 rounded-md"
              style={{ width: STAT_CARD_ICON_PX, height: STAT_CARD_ICON_PX }}
            />
            <Shimmer
              className="mb-1 rounded-md"
              style={{ height: STAT_CARD_LABEL_H_PX, width: "72%" }}
            />
            <Shimmer
              className="rounded-md"
              style={{ height: STAT_CARD_VALUE_H_PX, width: 48 }}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

function HeatmapGridSkeleton() {
  return (
    <div
      className="relative"
      style={{ width: HEATMAP_SVG_WIDTH_PX, height: HEATMAP_SVG_HEIGHT_PX }}
    >
      <div
        className="absolute left-0 top-0 flex gap-6"
        style={{
          height: HEATMAP_MONTH_LABEL_HEIGHT_PX,
          left: HEATMAP_DAY_LABEL_WIDTH_PX,
          width: HEATMAP_GRID_WIDTH_PX,
        }}
        aria-hidden
      >
        {Array.from({ length: 6 }, (_, index) => (
          <Shimmer
            key={index}
            className="rounded-sm"
            style={{ width: 24, height: 10, marginTop: 4 }}
          />
        ))}
      </div>

      <div
        className="absolute left-0 flex flex-col justify-between"
        style={{
          top: HEATMAP_MONTH_LABEL_HEIGHT_PX,
          width: HEATMAP_DAY_LABEL_WIDTH_PX - 8,
          height: HEATMAP_GRID_HEIGHT_PX,
        }}
        aria-hidden
      >
        <Shimmer className="rounded-sm" style={{ width: 20, height: 10 }} />
        <Shimmer className="rounded-sm" style={{ width: 24, height: 10 }} />
        <Shimmer className="rounded-sm" style={{ width: 20, height: 10 }} />
      </div>

      <div
        className="absolute grid"
        style={{
          left: HEATMAP_DAY_LABEL_WIDTH_PX,
          top: HEATMAP_MONTH_LABEL_HEIGHT_PX,
          width: HEATMAP_GRID_WIDTH_PX,
          height: HEATMAP_GRID_HEIGHT_PX,
          gridTemplateColumns: `repeat(${HEATMAP_WEEKS_DESKTOP}, ${HEATMAP_CELL_PX}px)`,
          gridTemplateRows: `repeat(${HEATMAP_DAYS}, ${HEATMAP_CELL_PX}px)`,
          gap: HEATMAP_GAP_PX,
        }}
        aria-hidden
      >
        {Array.from({ length: HEATMAP_CELL_COUNT }, (_, index) => (
          <div
            key={index}
            className="rounded-[2px] bg-[var(--color-heatmap-0)]"
            style={{ width: HEATMAP_CELL_PX, height: HEATMAP_CELL_PX }}
          />
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="print-section w-full min-w-0">
      <Section
        title="Contributions"
        subtitle="Push commits over the last 52 weeks"
        icon={CalendarDays}
        embedded
        headerDivider={false}
      >
        <div className="w-full" aria-hidden>
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Shimmer
                key={index}
                className="rounded"
                style={{ width: 40, height: 24 }}
              />
            ))}
          </div>
          <Shimmer
            className="mx-auto mb-3 rounded-md"
            style={{ width: 224, height: 20 }}
          />
          <HeatmapGridSkeleton />
          <div className="mt-3 flex items-center justify-end gap-1">
            <Shimmer className="rounded-sm" style={{ width: 28, height: 12 }} />
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="rounded-[2px] bg-[var(--color-heatmap-0)]"
                style={{ width: HEATMAP_CELL_PX, height: HEATMAP_CELL_PX }}
              />
            ))}
            <Shimmer className="rounded-sm" style={{ width: 28, height: 12 }} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function CommitFrequencySkeletonInner() {
  const totalHeight = commitFrequencySkeletonHeightPx();

  return (
    <Section title="Commit frequency" icon={BarChart3} embedded>
      <div style={{ minHeight: totalHeight }} aria-hidden>
        {Array.from({ length: COMMIT_FREQUENCY_SUBSECTIONS }, (_, index) => (
          <div
            key={index}
            style={{ paddingTop: COMMIT_FREQUENCY_SECTION_GAP_PX }}
          >
            <Shimmer
              className="rounded-md"
              style={{
                width: index === 0 ? 88 : index === 1 ? 104 : 72,
                height: COMMIT_FREQUENCY_SUBHEADER_H_PX,
                marginBottom: COMMIT_FREQUENCY_SUBHEADER_MB_PX,
              }}
            />
            <Shimmer
              className="w-full rounded-md"
              style={{ height: COMMIT_BAR_COMPACT_H_PX }}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}

export function ChartsSkeleton() {
  return (
    <GridCell className="min-w-0 overflow-hidden">
      <CommitFrequencySkeletonInner />
    </GridCell>
  );
}

export function ReposSkeleton() {
  return (
    <GridCell className="min-w-0 overflow-hidden">
      <Section title="Top repositories" icon={FolderGit2} embedded>
        <ul className={DASHBOARD_METRIC_GRID_REPOS_CLASS} aria-hidden>
          {REPO_TITLE_WIDTHS.map((titleWidth, index) => (
            <li key={titleWidth}>
              <div className={cn(DASHBOARD_METRIC_CARD_CLASS, "flex h-full flex-col")}>
                <Shimmer
                  className="rounded-md"
                  style={{ height: REPO_ROW_TITLE_H_PX, width: titleWidth }}
                />
                <Shimmer
                  className="mt-2 rounded-md"
                  style={{ height: REPO_ROW_DESC_H_PX, width: REPO_DESC_WIDTHS[index] }}
                />
                <Shimmer
                  className="mt-2 rounded-md"
                  style={{ height: REPO_ROW_UPDATED_H_PX, width: 112 }}
                />
                <div className="mt-auto flex gap-3 pt-3">
                  <Shimmer
                    className="rounded-md"
                    style={{ height: REPO_ROW_META_H_PX, width: REPO_ROW_META_H_PX }}
                  />
                  <Shimmer
                    className="rounded-md"
                    style={{ height: REPO_ROW_META_H_PX, width: 40 }}
                  />
                  <Shimmer
                    className="rounded-md"
                    style={{ height: REPO_ROW_META_H_PX, width: 48 }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </GridCell>
  );
}

export function StreakStatsSkeleton() {
  return (
    <GridCell className="min-w-0 overflow-hidden">
      <Section title="Streak stats" icon={Flame} embedded headerDivider={false}>
        <div className="space-y-4" aria-hidden>
          <div className={DASHBOARD_METRIC_GRID_STREAK_CLASS}>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className={DASHBOARD_METRIC_CARD_CLASS}>
                <Shimmer
                  className="rounded-md"
                  style={{
                    height: STREAK_LABEL_H_PX,
                    width: index === 0 ? 112 : index === 1 ? 120 : 96,
                  }}
                />
                <Shimmer
                  className="mt-2 rounded-md"
                  style={{
                    height:
                      index === 2 ? STREAK_ACTIVE_VALUE_H_PX : STREAK_CURRENT_VALUE_H_PX,
                    width: index === 1 ? 40 : 48,
                  }}
                />
                {index === 2 ? (
                  <>
                    <Shimmer
                      className="mt-3 w-full rounded-full"
                      style={{ height: STREAK_PROGRESS_H_PX }}
                    />
                    <Shimmer
                      className="mt-2 rounded-md"
                      style={{ height: STREAK_CAPTION_H_PX, width: "80%" }}
                    />
                  </>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-gh-gray-2 pt-5">
            <Shimmer
              className="rounded-md"
              style={{ height: 14, width: 112 }}
            />
            <Shimmer
              className="mt-2 w-full rounded-md"
              style={{ height: STREAK_TIMELINE_CHART_H_PX }}
            />
          </div>
        </div>
      </Section>
    </GridCell>
  );
}

export function ActivityListSkeleton() {
  const rowHeight = ACTIVITY_ICON_PX + ACTIVITY_ROW_PY_PX * 2;
  const listHeight =
    ACTIVITY_HEADING_H_PX +
    8 +
    ACTIVITY_SKELETON_ROWS * rowHeight;

  return (
    <GridCell className="min-w-0 overflow-hidden">
      <Section title="Recent activity" icon={GitBranch} embedded>
        <div style={{ minHeight: listHeight }} aria-hidden>
          <Shimmer
            className="rounded-md"
            style={{ height: ACTIVITY_HEADING_H_PX, width: 88 }}
          />
          <ul className="mt-2 divide-y divide-gh-gray-2">
            {ACTIVITY_LINE_WIDTHS.map((lineWidth) => (
              <li
                key={lineWidth}
                className="flex items-start gap-3"
                style={{ paddingTop: ACTIVITY_ROW_PY_PX, paddingBottom: ACTIVITY_ROW_PY_PX }}
              >
                <Shimmer
                  className="shrink-0 rounded-full"
                  style={{ width: ACTIVITY_ICON_PX, height: ACTIVITY_ICON_PX }}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Shimmer
                    className="rounded-md"
                    style={{ height: ACTIVITY_DESC_H_PX, width: lineWidth }}
                  />
                  <Shimmer
                    className="rounded-md"
                    style={{ height: ACTIVITY_REPO_H_PX, width: 128 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </GridCell>
  );
}

export function DashboardToolbarSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 border-b border-gh-gray-2 pb-4 sm:flex-row sm:items-center sm:justify-between"
      aria-hidden
    >
      <div className="flex items-center gap-4">
        <Shimmer
          className="rounded-full"
          style={{ width: HEADER_AVATAR_PX, height: HEADER_AVATAR_PX }}
        />
        <Shimmer
          className="rounded-md"
          style={{ height: HEADER_LOGIN_H_PX, width: 112 }}
        />
      </div>
      <Shimmer
        className="w-full rounded-md sm:max-w-xs"
        style={{ height: HEADER_SEARCH_H_PX }}
      />
    </div>
  );
}

export function MainSkeletonContent() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <StatCardsSkeleton />
      <div className="dashboard-grid">
        <HeatmapSkeleton />
        <ReposSkeleton />
        <StreakStatsSkeleton />
      </div>
    </div>
  );
}

/** Standalone heatmap placeholder for lazy chart loading. */
export function HeatmapChartSkeleton({
  scrollContained = true,
}: {
  scrollContained?: boolean;
} = {}) {
  return (
    <div
      className={cn("scrollbar-hidden w-full py-1", scrollContained && "overflow-x-auto")}
      aria-hidden
    >
      <HeatmapGridSkeleton />
    </div>
  );
}

export {
  COMMIT_BAR_CHART_H_PX,
  COMMIT_BAR_COMPACT_H_PX,
  COMMITS_BY_WEEKDAY_CHART_H_PX,
  COMMITS_BY_WEEKDAY_PEAK_H_PX,
} from "@/lib/skeleton-dimensions";
