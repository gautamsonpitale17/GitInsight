import { Suspense } from "react";
import {
  ActivityListSkeleton,
  ChartsSkeleton,
  HeatmapSkeleton,
  ReposSkeleton,
  StreakStatsSkeleton,
} from "@/components/dashboard/skeletons";
import { SmartErrorBoundary } from "@/components/ui/SmartErrorBoundary";
import type { ProfileTabId } from "@/lib/profile-tabs";
import { ActivitySection } from "./sections/activity-section";
import { ChartsSection } from "./sections/charts-section";
import { HeatmapSection } from "./sections/heatmap-section";
import { ReposSection } from "./sections/repos-section";
import { StreakSection } from "./sections/streak-section";

type ProfileDashboardProps = {
  username: string;
  tab: ProfileTabId;
};

function TabPanelGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-grid dashboard-print-grid" data-testid="dashboard-grid">
      {children}
    </div>
  );
}

export function ProfileDashboard({ username, tab }: ProfileDashboardProps) {
  switch (tab) {
    case "repositories":
      return (
        <TabPanelGrid>
          <SmartErrorBoundary sectionName="Repos">
            <Suspense fallback={<ReposSkeleton />}>
              <ReposSection username={username} />
            </Suspense>
          </SmartErrorBoundary>
        </TabPanelGrid>
      );

    case "commits":
      return (
        <TabPanelGrid>
          <SmartErrorBoundary sectionName="Recent activity">
            <Suspense fallback={<ActivityListSkeleton />}>
              <ActivitySection username={username} />
            </Suspense>
          </SmartErrorBoundary>
        </TabPanelGrid>
      );

    case "streak":
      return (
        <TabPanelGrid>
          <SmartErrorBoundary sectionName="Streak stats">
            <Suspense fallback={<StreakStatsSkeleton />}>
              <StreakSection username={username} />
            </Suspense>
          </SmartErrorBoundary>
        </TabPanelGrid>
      );

    case "overview":
    default:
      return (
        <TabPanelGrid>
          <SmartErrorBoundary sectionName="Heatmap">
            <Suspense fallback={<HeatmapSkeleton />}>
              <HeatmapSection username={username} />
            </Suspense>
          </SmartErrorBoundary>
          <SmartErrorBoundary sectionName="Commit frequency">
            <Suspense fallback={<ChartsSkeleton />}>
              <ChartsSection username={username} />
            </Suspense>
          </SmartErrorBoundary>
        </TabPanelGrid>
      );
  }
}
