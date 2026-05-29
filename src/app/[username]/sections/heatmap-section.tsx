import { HeatmapSection as HeatmapSectionUI } from "@/components/dashboard/HeatmapSection";
import { getDashboardActivity } from "@/lib/dashboard-fetch";

type HeatmapSectionProps = {
  username: string;
};

export async function HeatmapSection({ username }: HeatmapSectionProps) {
  const { activity, error } = await getDashboardActivity(username);

  return (
    <div className="print-section w-full min-w-0">
      <HeatmapSectionUI
        heatmap={activity?.heatmap}
        events={activity?.events}
        officialHeatmapByYear={activity?.officialHeatmapByYear}
        contributionYears={activity?.contributionYears}
        contributionTotalsByYear={activity?.contributionTotalsByYear}
        rollingYearContributions={activity?.rollingYearContributions}
        error={error ?? undefined}
        embedded
      />
    </div>
  );
}
