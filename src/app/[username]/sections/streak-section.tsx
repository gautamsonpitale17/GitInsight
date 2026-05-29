import Flame from "lucide-react/dist/esm/icons/flame.mjs";
import { GridCell } from "@/components/dashboard/skeletons";
import { StreakStats } from "@/components/dashboard/StreakStats";
import { Section } from "@/components/ui/Section";
import { EMPTY_COPY } from "@/lib/format";
import { SectionMessage } from "@/components/dashboard/SectionMessage";
import { getDashboardStreaks } from "@/lib/dashboard-fetch";

type StreakSectionProps = {
  username: string;
};

export async function StreakSection({ username }: StreakSectionProps) {
  const { streaks, error } = await getDashboardStreaks(username);

  return (
    <GridCell className="min-w-0 overflow-hidden">
      <Section
        title="Streak stats"
        subtitle="Consecutive days with push activity"
        icon={Flame}
        embedded
        headerDivider={false}
      >
        {error ? (
          <SectionMessage message={error} variant="error" />
        ) : streaks ? (
          <StreakStats data={streaks} />
        ) : (
          <SectionMessage message={EMPTY_COPY.streaks} />
        )}
      </Section>
    </GridCell>
  );
}
