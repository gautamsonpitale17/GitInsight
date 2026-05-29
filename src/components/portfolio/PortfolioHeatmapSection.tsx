import { Suspense } from "react";
import { HeatmapChartSkeleton } from "@/components/dashboard/skeletons";
import { getPortfolioGithubUsername } from "@/lib/portfolio-config";
import { loadPortfolioContributions } from "@/lib/portfolio-contributions";
import { PortfolioContributionHeatmap } from "./PortfolioContributionHeatmap";

async function PortfolioHeatmapContent({ username }: { username: string }) {
  const initialPayload = await loadPortfolioContributions(username);

  return (
    <PortfolioContributionHeatmap username={username} initialPayload={initialPayload} />
  );
}

function PortfolioHeatmapFallback({ username }: { username: string }) {
  return (
    <div aria-busy="true" aria-label={`Loading contributions for ${username}`}>
      <HeatmapChartSkeleton />
    </div>
  );
}

export function PortfolioHeatmapSection() {
  const username = getPortfolioGithubUsername();

  return (
    <section
      className="w-full"
      aria-label="Contribution heatmap"
      data-testid="portfolio-heatmap-section"
    >
      <Suspense fallback={<PortfolioHeatmapFallback username={username} />}>
        <PortfolioHeatmapContent username={username} />
      </Suspense>
    </section>
  );
}
