import Link from "next/link";
import GitBranch from "lucide-react/dist/esm/icons/git-branch.mjs";
import { LazyActivityTimeline } from "@/components/dashboard/chart-components";
import { GridCell } from "@/components/dashboard/skeletons";
import { Section } from "@/components/ui/Section";
import { EMPTY_COPY } from "@/lib/format";
import { SectionMessage } from "@/components/dashboard/SectionMessage";
import { getDashboardActivity } from "@/lib/dashboard-fetch";

type ActivitySectionProps = {
  username: string;
};

export async function ActivitySection({ username }: ActivitySectionProps) {
  const { activity, error } = await getDashboardActivity(username);
  const activities = activity?.items ?? [];

  return (
    <GridCell className="min-w-0 overflow-hidden">
      <Section
        title="Recent activity"
        subtitle="Public events from the last few pages of activity"
        icon={GitBranch}
        embedded
        action={
          <Link
            href={`https://github.com/${encodeURIComponent(username)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="gh-link text-sm font-medium"
          >
            View all
          </Link>
        }
      >
        {error ? (
          <SectionMessage message={error} variant="error" />
        ) : activities.length > 0 ? (
          <LazyActivityTimeline activities={activities} />
        ) : (
          <SectionMessage message={EMPTY_COPY.activitySection} />
        )}
      </Section>
    </GridCell>
  );
}
