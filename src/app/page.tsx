import { PortfolioHeatmapSection } from "@/components/portfolio/PortfolioHeatmapSection";
import { HomeSearchHero } from "./home-search-hero";

export default function Home() {
  return (
    <div className="app-page-fit home-page w-full max-w-none">
      <HomeSearchHero />
      <PortfolioHeatmapSection />
    </div>
  );
}
