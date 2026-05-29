import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3.mjs";
import {
  LazyCommitsByHour,
  LazyCommitsByWeekday,
} from "@/components/dashboard/chart-components";
import { GridCell } from "@/components/dashboard/skeletons";
import { Section, SectionSubheading } from "@/components/ui/Section";
import { SectionMessage } from "@/components/dashboard/SectionMessage";
import { getDashboardActivity } from "@/lib/dashboard-fetch";

type ChartsSectionProps = {
  username: string;
};

export async function ChartsSection({ username }: ChartsSectionProps) {
  const { activity, error } = await getDashboardActivity(username);

  const weekdayData = activity?.commitFrequency.byWeekday ?? [];
  const hourData = activity?.commitFrequency.byHour ?? [];

  return (
    <GridCell className="min-w-0 overflow-hidden">
      <Section
        title="Commit frequency"
        subtitle="When pushes happen by day and hour"
        icon={BarChart3}
        embedded
      >
        {error ? (
          <SectionMessage message={error} variant="error" />
        ) : (
          <div className="grid min-w-0 gap-6 md:grid-cols-2">
            <div className="min-w-0">
              <SectionSubheading>By weekday</SectionSubheading>
              <LazyCommitsByWeekday data={weekdayData} />
            </div>
            <div className="min-w-0">
              <SectionSubheading>By hour (UTC)</SectionSubheading>
              <LazyCommitsByHour data={hourData} />
            </div>
          </div>
        )}
      </Section>
    </GridCell>
  );
}
