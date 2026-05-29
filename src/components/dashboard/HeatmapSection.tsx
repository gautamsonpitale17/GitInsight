import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.mjs";
import { Section } from "@/components/ui/Section";
import { LazyContributionHeatmap } from "@/components/dashboard/chart-components";
import type { GitHubEvent, HeatmapCell } from "@/types/github";
import { SectionMessage } from "./SectionMessage";

type HeatmapSectionProps = {
  heatmap: HeatmapCell[][] | null | undefined;
  events?: GitHubEvent[];
  officialHeatmapByYear?: Record<number, HeatmapCell[][]>;
  contributionYears?: number[];
  contributionTotalsByYear?: Record<number, number>;
  rollingYearContributions?: {
    totalContributions: number;
    heatmap: HeatmapCell[][];
  };
  error?: string;
  embedded?: boolean;
};

export function HeatmapSection({
  heatmap,
  events,
  officialHeatmapByYear,
  contributionYears,
  contributionTotalsByYear,
  rollingYearContributions,
  error,
  embedded,
}: HeatmapSectionProps) {
  const usesOfficialCalendar = Boolean(
    rollingYearContributions?.heatmap?.length ||
      (officialHeatmapByYear && contributionYears?.length),
  );

  return (
    <Section
      title="Contributions"
      subtitle={
        usesOfficialCalendar
          ? "Official GitHub contribution calendar"
          : "Contribution activity"
      }
      icon={CalendarDays}
      embedded={embedded}
      headerDivider={false}
    >
      <div data-testid="heatmap-container" className="min-w-0">
        {error ? (
          <SectionMessage message={error} variant="error" />
        ) : (
          <LazyContributionHeatmap
            cells={heatmap ?? []}
            events={events}
            officialHeatmapByYear={officialHeatmapByYear}
            yearOptions={contributionYears}
            contributionTotalsByYear={contributionTotalsByYear}
            rollingYearContributions={rollingYearContributions}
            scrollContained={true}
          />
        )}
      </div>
    </Section>
  );
}
