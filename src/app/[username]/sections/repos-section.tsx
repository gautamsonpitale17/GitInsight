import Link from "next/link";
import FolderGit2 from "lucide-react/dist/esm/icons/folder-git-2.mjs";
import { TopRepos } from "@/components/dashboard/TopRepos";
import { GridCell } from "@/components/dashboard/skeletons";
import { Section } from "@/components/ui/Section";
import { SectionMessage } from "@/components/dashboard/SectionMessage";
import { getDashboardRepos } from "@/lib/dashboard-fetch";

type ReposSectionProps = {
  username: string;
};

export async function ReposSection({ username }: ReposSectionProps) {
  const { repos, error } = await getDashboardRepos(username);

  return (
    <GridCell className="min-w-0 overflow-hidden">
      <Section
        title="Top repositories"
        subtitle="Ranked by stars, forks, and recency"
        icon={FolderGit2}
        embedded
        headerDivider={false}
        action={
          <Link
            href={`https://github.com/${encodeURIComponent(username)}?tab=repositories`}
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
        ) : (
          <TopRepos repos={repos?.repos ?? []} />
        )}
      </Section>
    </GridCell>
  );
}
