import type { HeatmapLevel } from "@/types/github";
import { heatmapLevelVar } from "@/lib/theme-colors";

const LEVELS: HeatmapLevel[] = [0, 1, 2, 3, 4];

const CONTRIBUTION_LEVEL_LABELS: Record<HeatmapLevel, string> = {
  0: "No contributions",
  1: "Lowest contribution level",
  2: "Second quartile contribution level",
  3: "Third quartile contribution level",
  4: "Highest contribution level",
};

const ACTIVITY_LEVEL_LABELS: Record<HeatmapLevel, string> = {
  0: "No commits",
  1: "1–3 commits",
  2: "4–6 commits",
  3: "7–9 commits",
  4: "10+ commits",
};

type HeatmapLevelLegendProps = {
  variant?: "contributions" | "activity";
  className?: string;
};

export function HeatmapLevelLegend({
  variant = "contributions",
  className,
}: HeatmapLevelLegendProps) {
  const labels =
    variant === "activity" ? ACTIVITY_LEVEL_LABELS : CONTRIBUTION_LEVEL_LABELS;

  return (
    <div
      className={[
        "mt-3 flex flex-wrap items-center justify-end gap-2 text-xs text-gh-gray-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Activity level legend"
    >
      <span className="sr-only">Activity levels from least to most:</span>
      <span aria-hidden>Less</span>
      <ul className="inline-flex items-center gap-1" aria-label="Activity levels">
        {LEVELS.map((level) => (
          <li key={level}>
            <span className="inline-flex items-center gap-1">
              <span
                className="size-[11px] shrink-0 rounded-[2px]"
                style={{ backgroundColor: heatmapLevelVar(level) }}
                aria-hidden
              />
              <span className="sr-only">{labels[level]}</span>
            </span>
          </li>
        ))}
      </ul>
      <span aria-hidden>More</span>
    </div>
  );
}
