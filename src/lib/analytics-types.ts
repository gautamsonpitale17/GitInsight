export type InsightType = "positive" | "neutral" | "tip";

export interface Insight {
  type: InsightType;
  text: string;
  /** Emoji character or Lucide icon name in PascalCase (e.g. `Flame`). */
  icon: string;
}

export type SocialScoreBadge = "Rising Star" | "Contributor" | "Influencer" | "Legend";

export interface CompletenessResult {
  score: number;
  missing: string[];
  tips: string[];
}
