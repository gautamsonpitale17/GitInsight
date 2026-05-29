"use client";

import GitCommit from "lucide-react/dist/esm/icons/git-commit.mjs";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { HeatmapLevelLegend } from "@/components/accessibility/HeatmapLevelLegend";
import { ChartEmptyState } from "@/components/ui/ChartEmptyState";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useElementWidth } from "@/hooks/useElementWidth";
import { getPushEventsForDate } from "@/lib/analytics-client";
import {
  EMPTY_COPY,
  formatCount,
  formatLongDate,
  formatLongDateKey,
  formatTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  HEATMAP_CELL_PX,
  HEATMAP_DAYS,
  HEATMAP_DAY_LABEL_WIDTH_PX,
  HEATMAP_GAP_PX,
  HEATMAP_MONTH_LABEL_HEIGHT_PX,
  HEATMAP_WEEKS_DESKTOP,
} from "@/components/charts/heatmap-layout";
import {
  colorVar,
  heatmapCurrentWeekVar,
  heatmapLevelVar,
} from "@/lib/theme-colors";
import { getClampedTooltipPosition } from "@/lib/tooltip-position";
import type { GitHubEvent, HeatmapCell, HeatmapDayPush, HeatmapLevel } from "@/types/github";

const WEEKS_DESKTOP = HEATMAP_WEEKS_DESKTOP;
const DAYS = HEATMAP_DAYS;
const CELL_SIZE = HEATMAP_CELL_PX;
const GAP = HEATMAP_GAP_PX;
const STEP = CELL_SIZE + GAP;
const LEVELS: HeatmapLevel[] = [0, 1, 2, 3, 4];
const LAST_YEAR_PERIOD = "last-year" as const;

type HeatmapPeriod = typeof LAST_YEAR_PERIOD | number;

const DAY_LABEL_WIDTH = HEATMAP_DAY_LABEL_WIDTH_PX;
const MONTH_LABEL_HEIGHT = HEATMAP_MONTH_LABEL_HEIGHT_PX;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Below this chart container width, day labels use single letters (scaled ~8px is borderline). */
const HEATMAP_COMPACT_DAY_LABEL_WIDTH_PX = 700;

const DAY_LABEL_ROWS: { row: number; label: string; shortLabel: string }[] = [
  { row: 1, label: "Mon", shortLabel: "M" },
  { row: 3, label: "Wed", shortLabel: "W" },
  { row: 5, label: "Fri", shortLabel: "F" },
];

const MIN_MONTH_LABEL_GAP_WEEKS = 3;
/** Extra viewBox width so end-of-year month labels are not clipped. */
const VIEWBOX_PAD_RIGHT = 12;

interface MonthLabel {
  week: number;
  text: string;
}

interface HeatmapRect {
  x: number;
  y: number;
  day: number;
  week: number;
  cell: HeatmapCell;
}

interface LevelBatch {
  fill: string;
  rects: HeatmapRect[];
}

interface CellPosition {
  day: number;
  week: number;
}

export interface ContributionHeatmapProps {
  cells?: HeatmapCell[][];
  events?: GitHubEvent[];
  yearOptions?: readonly number[];
  year?: number;
  /** Official GitHub contribution calendar per calendar year (GraphQL). */
  officialHeatmapByYear?: Record<number, HeatmapCell[][]>;
  /** Official GitHub totals per calendar year. */
  contributionTotalsByYear?: Record<number, number>;
  /** Default github.com profile view — contributions in the last year. */
  rollingYearContributions?: {
    totalContributions: number;
    heatmap: HeatmapCell[][];
  };
  /** When false, the heatmap does not scroll inside its own container (page scroll only). */
  scrollContained?: boolean;
}

interface TooltipState {
  cell: HeatmapCell;
  left: number;
  top: number;
  transform: string;
}

function parseUTCDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatAriaLabel(cell: HeatmapCell): string {
  const dateLabel = formatLongDateKey(cell.date);
  return `${formatCount(cell.count)} contributions on ${dateLabel}`;
}

function toUTCDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** First week column where each new UTC month begins (Sunday date in row 0). */
function computeMonthBoundaries(firstRow: HeatmapCell[]): MonthLabel[] {
  const boundaries: MonthLabel[] = [];
  let previousMonth = -1;

  for (let week = 0; week < firstRow.length; week += 1) {
    const cell = firstRow[week];
    if (!cell?.date) {
      continue;
    }

    const month = parseUTCDate(cell.date).getUTCMonth();
    if (month !== previousMonth) {
      boundaries.push({ week, text: MONTH_LABELS[month] ?? "" });
      previousMonth = month;
    }
  }

  return boundaries;
}

/** Drops labels when month boundaries are fewer than `minGap` columns apart. */
function filterOverlappingMonthLabels(
  labels: MonthLabel[],
  minGap = MIN_MONTH_LABEL_GAP_WEEKS,
): MonthLabel[] {
  if (labels.length === 0) {
    return [];
  }

  const filtered: MonthLabel[] = [labels[0]];

  for (let index = 1; index < labels.length; index += 1) {
    const label = labels[index];
    const lastWeek = filtered[filtered.length - 1].week;
    if (label.week - lastWeek >= minGap) {
      filtered.push(label);
    }
  }

  return filtered;
}

/** Week indices where the UTC year increases (Jan column after Dec). */
function computeYearSeparators(firstRow: HeatmapCell[]): number[] {
  const separators: number[] = [];
  let previousYear: number | null = null;

  for (let week = 0; week < firstRow.length; week += 1) {
    const cell = firstRow[week];
    if (!cell?.date) {
      continue;
    }

    const year = parseUTCDate(cell.date).getUTCFullYear();
    if (previousYear !== null && year !== previousYear) {
      separators.push(week);
    }
    previousYear = year;
  }

  return separators;
}

function getCurrentWeekIndex(firstRow: HeatmapCell[], period: HeatmapPeriod): number | null {
  const today = parseUTCDate(toUTCDateKey(new Date()));
  if (typeof period === "number" && today.getUTCFullYear() !== period) {
    return null;
  }

  for (let week = 0; week < firstRow.length; week += 1) {
    const cell = firstRow[week];
    if (!cell?.date) {
      continue;
    }

    const weekStart = parseUTCDate(cell.date);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    if (today >= weekStart && today <= weekEnd) {
      return week;
    }
  }

  return null;
}

function getMonthLabelX(week: number): number {
  return DAY_LABEL_WIDTH + week * STEP + CELL_SIZE / 2;
}

function collectHeatmapRects(
  visibleCells: HeatmapCell[][],
  weeksToShow: number,
): HeatmapRect[] {
  const rects: HeatmapRect[] = [];

  for (let day = 0; day < visibleCells.length; day += 1) {
    const row = visibleCells[day];
    for (let week = 0; week < weeksToShow; week += 1) {
      const cell = row[week];
      if (!cell) {
        continue;
      }

      rects.push({
        x: week * STEP,
        y: day * STEP,
        day,
        week,
        cell,
      });
    }
  }

  return rects;
}

/** Groups cell rects by contribution level (0–4), with a separate palette for the current week. */
function buildLevelBatches(
  rects: HeatmapRect[],
  currentWeekIndex: number | null,
): LevelBatch[] {
  const normal: Record<HeatmapLevel, HeatmapRect[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  const currentWeek: Record<HeatmapLevel, HeatmapRect[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };

  for (const rect of rects) {
    if (rect.week === currentWeekIndex) {
      currentWeek[rect.cell.level].push(rect);
    } else {
      normal[rect.cell.level].push(rect);
    }
  }

  const batches: LevelBatch[] = [];
  for (const level of LEVELS) {
    if (normal[level].length > 0) {
      batches.push({ fill: heatmapLevelVar(level), rects: normal[level] });
    }
    if (currentWeek[level].length > 0) {
      batches.push({ fill: heatmapCurrentWeekVar(level), rects: currentWeek[level] });
    }
  }

  return batches;
}

interface HeatmapTooltipProps {
  cell: HeatmapCell;
  left: number;
  top: number;
  transform: string;
  visible: boolean;
}

function HeatmapTooltip({ cell, left, top, transform, visible }: HeatmapTooltipProps) {
  const date = formatLongDateKey(cell.date);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="tooltip"
      className="chart-tooltip pointer-events-none fixed z-[100] rounded px-2 py-2 text-xs leading-snug shadow-lg transition-opacity duration-100"
      style={{
        left,
        top,
        transform,
        opacity: visible ? 1 : 0,
      }}
    >
      <div>{date}</div>
      <div>
        <span className="gh-stat-number">{formatCount(cell.count)}</span> contributions
      </div>
    </div>,
    document.body,
  );
}

interface PeriodFilterTabsProps {
  years: readonly number[];
  selectedPeriod: HeatmapPeriod;
  onSelectPeriod: (period: HeatmapPeriod) => void;
}

function PeriodFilterTabs({ years, selectedPeriod, onSelectPeriod }: PeriodFilterTabsProps) {
  return (
    <div className="heatmap-period-tabs" role="tablist" aria-label="Contribution period">
      <button
        type="button"
        role="tab"
        aria-selected={selectedPeriod === LAST_YEAR_PERIOD}
        className={cn(
          "gh-btn gh-btn-subtle tap-target-mobile rounded px-2 py-0.5 text-sm",
          selectedPeriod === LAST_YEAR_PERIOD
            ? "font-semibold text-gh-gray-7"
            : "text-gh-gray-5 hover:text-gh-gray-7",
        )}
        onClick={() => onSelectPeriod(LAST_YEAR_PERIOD)}
      >
        Last year
      </button>
      {years.map((year) => (
        <span key={year} className="inline-flex items-center gap-1">
          <span className="select-none text-gh-gray-3" aria-hidden>
            |
          </span>
          <button
            type="button"
            role="tab"
            aria-selected={selectedPeriod === year}
            className={cn(
              "gh-btn gh-btn-subtle tap-target-mobile rounded px-2 py-0.5 text-sm",
              selectedPeriod === year
                ? "font-semibold text-gh-gray-7"
                : "text-gh-gray-5 hover:text-gh-gray-7",
            )}
            onClick={() => onSelectPeriod(year)}
          >
            {year}
          </button>
        </span>
      ))}
    </div>
  );
}

interface DayActivityPanelProps {
  dateKey: string;
  pushes: HeatmapDayPush[];
  onClose: () => void;
}

function DayActivityPanel({ dateKey, pushes, onClose }: DayActivityPanelProps) {
  const dateLabel = formatLongDate(parseUTCDate(dateKey));

  return (
    <div
      className="mt-4 rounded-md border border-gh-gray-2 bg-gh-gray-0 p-4"
      role="region"
      aria-label={`Push activity on ${dateLabel}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-gh-gray-7">{dateLabel}</h3>
        <button
          type="button"
          className="gh-btn gh-btn-subtle tap-target-mobile shrink-0 px-2 py-0.5 text-sm text-gh-gray-5"
          onClick={onClose}
          aria-label="Close day activity panel"
        >
          Close
        </button>
      </div>

      {pushes.length === 0 ? (
        <p className="text-readable mt-3 text-sm text-gh-gray-5">
          {EMPTY_COPY.heatmapDay}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pushes.map((push) => (
            <li key={push.id} className="flex gap-2 text-sm">
              <GitCommit className="mt-0.5 h-4 w-4 shrink-0 text-gh-green" aria-hidden />
              <div className="min-w-0 flex-1">
                <a
                  href={`https://github.com/${push.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gh-link font-medium"
                >
                  {push.description}
                </a>
                {push.firstCommitMessage ? (
                  <p
                    className="text-readable mt-0.5 text-sm text-gh-gray-5"
                    title={push.firstCommitMessage}
                  >
                    {push.firstCommitMessage}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-gh-gray-4">{formatTime(push.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ContributionHeatmapComponent({
  cells = [],
  events = [],
  yearOptions = [],
  year,
  officialHeatmapByYear,
  contributionTotalsByYear,
  rollingYearContributions,
  scrollContained = true,
}: ContributionHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heatmapChartRef = useRef<HTMLDivElement>(null);
  const heatmapChartWidth = useElementWidth(heatmapChartRef);
  const gridRef = useRef<SVGSVGElement>(null);
  const isInView = useInView(containerRef);
  const prefersReducedMotion = usePrefersReducedMotion();
  const useCellAnimation = isInView && !prefersReducedMotion;
  const useCompactDayLabels =
    heatmapChartWidth > 0 && heatmapChartWidth < HEATMAP_COMPACT_DAY_LABEL_WIDTH_PX;

  const hasOfficialData = Boolean(
    rollingYearContributions?.heatmap?.length ||
      (officialHeatmapByYear && Object.keys(officialHeatmapByYear).length > 0),
  );

  const resolvedYearOptions = useMemo(() => {
    if (officialHeatmapByYear) {
      return Object.keys(officialHeatmapByYear)
        .map(Number)
        .sort((a, b) => b - a);
    }
    return [...yearOptions];
  }, [officialHeatmapByYear, yearOptions]);

  const defaultPeriod: HeatmapPeriod =
    rollingYearContributions?.heatmap?.length
      ? LAST_YEAR_PERIOD
      : (year ?? resolvedYearOptions[0] ?? new Date().getUTCFullYear());

  const [selectedPeriod, setSelectedPeriod] = useState<HeatmapPeriod>(defaultPeriod);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  const periodGrid = useMemo(() => {
    if (selectedPeriod === LAST_YEAR_PERIOD) {
      return rollingYearContributions?.heatmap ?? cells;
    }

    const officialGrid = officialHeatmapByYear?.[selectedPeriod];
    if (officialGrid?.length) {
      return officialGrid;
    }

    return cells;
  }, [cells, officialHeatmapByYear, rollingYearContributions, selectedPeriod]);

  const totalContributions = useMemo(() => {
    if (selectedPeriod === LAST_YEAR_PERIOD) {
      return rollingYearContributions?.totalContributions ?? 0;
    }

    return contributionTotalsByYear?.[selectedPeriod] ?? 0;
  }, [contributionTotalsByYear, rollingYearContributions, selectedPeriod]);

  const hasContributions = totalContributions > 0;
  const weeksToShow = periodGrid[0]?.length ?? WEEKS_DESKTOP;
  const visibleCells = periodGrid;

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cellLookupRef = useRef<Map<string, HeatmapCell>>(new Map());

  const gridWidth = weeksToShow * CELL_SIZE + (weeksToShow - 1) * GAP;
  const gridHeight = DAYS * CELL_SIZE + (DAYS - 1) * GAP;
  const svgWidth = DAY_LABEL_WIDTH + gridWidth;
  const svgHeight = MONTH_LABEL_HEIGHT + gridHeight;
  const viewBoxWidth = svgWidth + VIEWBOX_PAD_RIGHT;
  const viewBox = `0 0 ${viewBoxWidth} ${svgHeight}`;
  /** Stays 12 in viewBox (~10px on screen at 652px / 780 viewBox width). */
  const monthLabelFontSize = 12;
  const dayLabelFontSize = useCompactDayLabels ? 10 : 12;

  const firstWeekRow = visibleCells[0];

  const monthLabels = useMemo(() => {
    if (!firstWeekRow?.length) {
      return [];
    }
    return filterOverlappingMonthLabels(computeMonthBoundaries(firstWeekRow));
  }, [firstWeekRow]);

  const yearSeparators = useMemo(() => {
    if (!firstWeekRow?.length) {
      return [];
    }
    return computeYearSeparators(firstWeekRow);
  }, [firstWeekRow]);

  const currentWeekIndex = useMemo(() => {
    if (!firstWeekRow?.length) {
      return null;
    }
    return getCurrentWeekIndex(firstWeekRow, selectedPeriod);
  }, [firstWeekRow, selectedPeriod]);

  const heatmapRects = useMemo(() => {
    if (!isInView) {
      return [];
    }
    return collectHeatmapRects(visibleCells, weeksToShow);
  }, [visibleCells, weeksToShow, isInView]);

  const levelBatches = useMemo(
    () => buildLevelBatches(heatmapRects, currentWeekIndex),
    [heatmapRects, currentWeekIndex],
  );

  const dayPanelPushes = useMemo(() => {
    if (!selectedDateKey || events.length === 0) {
      return [];
    }
    return getPushEventsForDate(events, selectedDateKey);
  }, [events, selectedDateKey]);

  useEffect(() => {
    const lookup = new Map<string, HeatmapCell>();
    for (let day = 0; day < visibleCells.length; day += 1) {
      const row = visibleCells[day];
      for (let week = 0; week < weeksToShow; week += 1) {
        const cell = row[week];
        if (cell) {
          lookup.set(`${day}:${week}`, cell);
        }
      }
    }
    cellLookupRef.current = lookup;
  }, [visibleCells, weeksToShow]);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleSelectPeriod = useCallback((nextPeriod: HeatmapPeriod) => {
    setSelectedPeriod(nextPeriod);
    setSelectedDateKey(null);
    setFocusedCell(null);
    setHoveredWeek(null);
    setTooltipVisible(false);
    setTooltip(null);
  }, []);

  const activateCell = useCallback((cell: HeatmapCell, position: CellPosition) => {
    setFocusedCell(position);
    setSelectedDateKey(cell.date);
  }, []);

  const handleGridMouseOver = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      const target = event.target;
      if (!(target instanceof SVGRectElement) || !target.dataset.day || !target.dataset.week) {
        return;
      }

      const day = Number(target.dataset.day);
      const week = Number(target.dataset.week);
      const cell = cellLookupRef.current.get(`${day}:${week}`);
      if (!cell) {
        return;
      }

      setHoveredWeek(week);
      clearHideTimeout();

      const position = getClampedTooltipPosition(target.getBoundingClientRect(), {
        estimateHeight: 72,
      });

      setTooltip({
        cell,
        left: position.left,
        top: position.top,
        transform: position.transform,
      });
      setTooltipVisible(true);
    },
    [clearHideTimeout],
  );

  const handleGridMouseLeave = useCallback(() => {
    setHoveredWeek(null);
    setTooltipVisible(false);
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setTooltip(null);
      hideTimeoutRef.current = null;
    }, 100);
  }, [clearHideTimeout]);

  const handleCellClick = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const day = Number(event.currentTarget.dataset.day);
      const week = Number(event.currentTarget.dataset.week);
      const cell = cellLookupRef.current.get(`${day}:${week}`);
      if (!cell) {
        return;
      }
      activateCell(cell, { day, week });
    },
    [activateCell],
  );

  const handleCellFocus = useCallback((event: React.FocusEvent<SVGRectElement>) => {
    const day = Number(event.currentTarget.dataset.day);
    const week = Number(event.currentTarget.dataset.week);
    setFocusedCell({ day, week });
    setHoveredWeek(week);
  }, []);

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const lookup = cellLookupRef.current;
      if (lookup.size === 0) {
        return;
      }

      if (!focusedCell) {
        if (
          event.key === "ArrowRight" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowUp" ||
          event.key === "ArrowDown"
        ) {
          event.preventDefault();
          setFocusedCell({ day: 0, week: 0 });
          setHoveredWeek(0);
          gridRef.current
            ?.querySelector<SVGRectElement>('[data-day="0"][data-week="0"]')
            ?.focus();
        }
        return;
      }

      let nextDay = focusedCell.day;
      let nextWeek = focusedCell.week;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextWeek = Math.min(nextWeek + 1, weeksToShow - 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        nextWeek = Math.max(nextWeek - 1, 0);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        nextDay = Math.min(nextDay + 1, DAYS - 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        nextDay = Math.max(nextDay - 1, 0);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const cell = lookup.get(`${focusedCell.day}:${focusedCell.week}`);
        if (cell) {
          setSelectedDateKey(cell.date);
        }
        return;
      } else if (event.key === "Escape") {
        event.preventDefault();
        setSelectedDateKey(null);
        return;
      } else {
        return;
      }

      const nextCell = lookup.get(`${nextDay}:${nextWeek}`);
      if (!nextCell) {
        return;
      }

      setFocusedCell({ day: nextDay, week: nextWeek });
      setHoveredWeek(nextWeek);

      const cellElement = gridRef.current?.querySelector<SVGRectElement>(
        `[data-day="${nextDay}"][data-week="${nextWeek}"]`,
      );
      cellElement?.focus();
    },
    [focusedCell, weeksToShow],
  );

  useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);

  const ariaLabel =
    selectedPeriod === LAST_YEAR_PERIOD
      ? "Contribution activity for the last year. Use arrow keys to move between days, Enter to view push activity."
      : `Contribution activity for ${selectedPeriod}. Use arrow keys to move between days, Enter to view push activity.`;

  const summaryId = useId();

  if (!hasOfficialData) {
    return (
      <div ref={containerRef} className="w-full min-w-0 max-w-full">
        <ChartEmptyState message="Unable to load the official GitHub contribution calendar." />
      </div>
    );
  }

  const summaryLabel =
    selectedPeriod === LAST_YEAR_PERIOD ? (
      <>
        <span className="gh-stat-number">{formatCount(totalContributions)}</span> contributions in
        the last year
      </>
    ) : (
      <>
        <span className="gh-stat-number">{formatCount(totalContributions)}</span> contributions in{" "}
        <span className="gh-stat-number">{selectedPeriod}</span>
      </>
    );

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full">
      {resolvedYearOptions.length > 0 ? (
        <PeriodFilterTabs
          years={resolvedYearOptions}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={handleSelectPeriod}
        />
      ) : null}

      <p
        id={summaryId}
        className="text-readable mb-3 text-sm text-gh-gray-5"
      >
        {summaryLabel}
      </p>

      <div
        className={cn(
          "w-full min-w-0 max-w-full",
          scrollContained
            ? "heatmap-scroll-container overflow-x-auto overscroll-x-contain md:overflow-x-visible"
            : "overflow-visible",
        )}
      >
        <div
          ref={heatmapChartRef}
          className={cn(
            "relative w-full min-w-0 rounded",
            useCellAnimation && "chart-fade-enter",
            useCellAnimation && isInView && "is-inview",
          )}
          style={{ aspectRatio: `${viewBoxWidth} / ${svgHeight}` }}
          tabIndex={0}
          role="img"
          aria-label={ariaLabel}
          aria-describedby={summaryId}
          onKeyDown={handleGridKeyDown}
        >
          <svg
            ref={gridRef}
            viewBox={viewBox}
            width="100%"
            height="100%"
            preserveAspectRatio="xMinYMin meet"
            aria-hidden
            className="block h-full w-full overflow-visible"
          >
            {monthLabels.map(({ week, text }) => (
              <text
                key={`${week}-${text}`}
                x={getMonthLabelX(week)}
                y={10}
                textAnchor="middle"
                className="fill-gh-gray-5"
                fontSize={monthLabelFontSize}
              >
                {text}
              </text>
            ))}

            {DAY_LABEL_ROWS.map(({ row, label, shortLabel }) => {
              const dayLabel = useCompactDayLabels ? shortLabel : label;
              return (
                <text
                  key={label}
                  x={0}
                  y={MONTH_LABEL_HEIGHT + row * STEP + CELL_SIZE / 2}
                  dominantBaseline="middle"
                  className="fill-gh-gray-5"
                  fontSize={dayLabelFontSize}
                >
                  {dayLabel}
                </text>
              );
            })}

            <g transform={`translate(${DAY_LABEL_WIDTH}, ${MONTH_LABEL_HEIGHT})`}>
              {!isInView ? (
                <rect
                  width={gridWidth}
                  height={gridHeight}
                  rx={4}
                  ry={4}
                  fill={heatmapLevelVar(0)}
                  aria-hidden
                />
              ) : (
                <>
                  {yearSeparators.map((week) => (
                    <line
                      key={`year-sep-${week}`}
                      x1={week * STEP - GAP / 2}
                      y1={0}
                      x2={week * STEP - GAP / 2}
                      y2={gridHeight}
                      stroke={colorVar.heatmapSeparator}
                      strokeWidth={1}
                    />
                  ))}

                  {hoveredWeek !== null ? (
                    <rect
                      x={hoveredWeek * STEP - GAP / 2}
                      y={0}
                      width={CELL_SIZE + GAP}
                      height={gridHeight}
                      fill="none"
                      stroke="var(--gh-gray-3)"
                      strokeWidth={1}
                      rx={2}
                      pointerEvents="none"
                    />
                  ) : null}

                  {currentWeekIndex !== null ? (
                    <rect
                      x={currentWeekIndex * STEP - 1}
                      y={-1}
                      width={CELL_SIZE + 2}
                      height={gridHeight + 2}
                      rx={3}
                      ry={3}
                      fill="none"
                      stroke={colorVar.heatmapCurrentWeekRing}
                      strokeWidth={1}
                      pointerEvents="none"
                    />
                  ) : null}

                  <g className="pointer-events-none">
                    {levelBatches.map((batch) => (
                      <g key={batch.fill} fill={batch.fill}>
                        {batch.rects.map((rect) => (
                          <rect
                            key={`${rect.day}-${rect.week}-${rect.cell.date}`}
                            x={rect.x}
                            y={rect.y}
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            rx={2}
                            ry={2}
                            className={
                              useCellAnimation
                                ? `heatmap-column-enter${isInView ? " is-inview" : ""}`
                                : undefined
                            }
                            style={
                              useCellAnimation
                                ? { animationDelay: `${rect.week * 14}ms` }
                                : undefined
                            }
                          />
                        ))}
                      </g>
                    ))}
                  </g>

                  <g onMouseOver={handleGridMouseOver} onMouseLeave={handleGridMouseLeave}>
                    {heatmapRects.map((rect) => {
                      const isFocused =
                        focusedCell?.day === rect.day && focusedCell?.week === rect.week;
                      const isCurrentWeek = rect.week === currentWeekIndex;
                      const fill = isCurrentWeek
                        ? heatmapCurrentWeekVar(rect.cell.level)
                        : heatmapLevelVar(rect.cell.level);

                      return (
                        <rect
                          key={`hit-${rect.day}-${rect.week}`}
                          x={rect.x}
                          y={rect.y}
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          rx={2}
                          ry={2}
                          fill={fill}
                          fillOpacity={0.01}
                          stroke={isFocused ? "var(--gh-blue)" : "transparent"}
                          strokeWidth={isFocused ? 1.5 : 0}
                          data-day={rect.day}
                          data-week={rect.week}
                          tabIndex={isFocused ? 0 : -1}
                          aria-label={formatAriaLabel(rect.cell)}
                          className="cursor-pointer"
                          onClick={handleCellClick}
                          onFocus={handleCellFocus}
                        />
                      );
                    })}
                  </g>
                </>
              )}
            </g>
          </svg>

          {tooltip ? (
            <HeatmapTooltip
              cell={tooltip.cell}
              left={tooltip.left}
              top={tooltip.top}
              transform={tooltip.transform}
              visible={tooltipVisible}
            />
          ) : null}
        </div>
      </div>

      <HeatmapLevelLegend variant="contributions" />

      {selectedDateKey ? (
        <DayActivityPanel
          dateKey={selectedDateKey}
          pushes={dayPanelPushes}
          onClose={() => setSelectedDateKey(null)}
        />
      ) : null}

      {!hasContributions ? (
        <ChartEmptyState
          message={
            selectedPeriod === LAST_YEAR_PERIOD
              ? "No contributions in the last year yet."
              : EMPTY_COPY.contributions(selectedPeriod)
          }
        />
      ) : null}
    </div>
  );
}

function contributionHeatmapPropsAreEqual(
  prev: ContributionHeatmapProps,
  next: ContributionHeatmapProps,
): boolean {
  return (
    prev.cells === next.cells &&
    prev.events === next.events &&
    prev.year === next.year &&
    prev.yearOptions === next.yearOptions &&
    prev.officialHeatmapByYear === next.officialHeatmapByYear &&
    prev.contributionTotalsByYear === next.contributionTotalsByYear &&
    prev.rollingYearContributions === next.rollingYearContributions &&
    prev.scrollContained === next.scrollContained
  );
}

export const ContributionHeatmap = memo(
  ContributionHeatmapComponent,
  contributionHeatmapPropsAreEqual,
);
