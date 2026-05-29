import type { HeatmapCell, HeatmapLevel } from "@/types/github";
import { fetchGitHubGraphQL } from "@/lib/github-graphql";

const CONTRIBUTION_LEVEL_MAP: Record<string, HeatmapLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const MAX_CONTRIBUTION_YEARS = 15;

export type ContributionDay = {
  date: string;
  contributionCount: number;
  contributionLevel: HeatmapLevel;
};

export type ContributionCalendar = {
  totalContributions: number;
  weeks: Array<{ contributionDays: ContributionDay[] }>;
};

export type ContributionsYearData = {
  year: number;
  totalContributions: number;
  heatmap: HeatmapCell[][];
  activeDates: string[];
};

export type RollingYearCalendar = {
  totalContributions: number;
  heatmap: HeatmapCell[][];
};

export type ContributionsPayload = {
  years: number[];
  totalsByYear: Record<number, number>;
  heatmapByYear: Record<number, HeatmapCell[][]>;
  /** Default github.com profile view — contributions in the last year. */
  rollingYear: RollingYearCalendar;
  activeDates: string[];
  source: "github_graphql";
};

type GraphQLContributionDay = {
  contributionCount: number;
  date: string;
  contributionLevel: string;
};

type GraphQLContributionCalendar = {
  totalContributions: number;
  weeks: Array<{
    contributionDays: GraphQLContributionDay[];
  }>;
};

type UserContributionsQuery = {
  user: {
    createdAt: string;
    contributionsCollection: {
      contributionCalendar: GraphQLContributionCalendar;
    };
  } | null;
};

const USER_CONTRIBUTIONS_QUERY = `
  query UserContributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      createdAt
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

const USER_CONTRIBUTIONS_ROLLING_QUERY = `
  query UserContributionsRolling($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

type UserContributionsRollingQuery = {
  user: {
    contributionsCollection: {
      contributionCalendar: GraphQLContributionCalendar;
    };
  } | null;
};

function contributionLevelFromGraphQL(level: string): HeatmapLevel {
  return CONTRIBUTION_LEVEL_MAP[level] ?? 0;
}

/** Converts GitHub's week columns into the app's day-row × week-column grid. */
export function buildHeatmapFromContributionCalendar(
  calendar: GraphQLContributionCalendar,
): HeatmapCell[][] {
  const grid: HeatmapCell[][] = Array.from({ length: 7 }, () => []);

  for (let weekIndex = 0; weekIndex < calendar.weeks.length; weekIndex += 1) {
    const week = calendar.weeks[weekIndex];

    for (let dayIndex = 0; dayIndex < week.contributionDays.length; dayIndex += 1) {
      const day = week.contributionDays[dayIndex];
      if (!grid[dayIndex]) {
        grid[dayIndex] = [];
      }

      grid[dayIndex][weekIndex] = {
        date: day.date,
        count: day.contributionCount,
        level: contributionLevelFromGraphQL(day.contributionLevel),
      };
    }
  }

  return grid;
}

function yearDateRange(year: number): { from: string; to: string } {
  return {
    from: `${year}-01-01T00:00:00Z`,
    to: `${year}-12-31T23:59:59Z`,
  };
}

function getContributionYears(createdAt: string, currentYear = new Date().getUTCFullYear()): number[] {
  const createdYear = new Date(createdAt).getUTCFullYear();
  const startYear = Number.isFinite(createdYear) ? createdYear : currentYear;
  const years: number[] = [];

  for (let year = currentYear; year >= startYear && years.length < MAX_CONTRIBUTION_YEARS; year -= 1) {
    years.push(year);
  }

  return years;
}

function collectActiveDates(calendar: GraphQLContributionCalendar): string[] {
  const activeDates: string[] = [];

  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      if (day.contributionCount > 0) {
        activeDates.push(day.date);
      }
    }
  }

  return activeDates;
}

async function fetchRollingYearCalendar(login: string): Promise<RollingYearCalendar | null> {
  const data = await fetchGitHubGraphQL<UserContributionsRollingQuery>(
    USER_CONTRIBUTIONS_ROLLING_QUERY,
    { login },
  );

  const calendar = data.user?.contributionsCollection.contributionCalendar;
  if (!calendar) {
    return null;
  }

  return {
    totalContributions: calendar.totalContributions,
    heatmap: buildHeatmapFromContributionCalendar(calendar),
  };
}

async function fetchContributionYear(
  login: string,
  year: number,
): Promise<ContributionsYearData | null> {
  const { from, to } = yearDateRange(year);
  const data = await fetchGitHubGraphQL<UserContributionsQuery>(USER_CONTRIBUTIONS_QUERY, {
    login,
    from,
    to,
  });

  const calendar = data.user?.contributionsCollection.contributionCalendar;
  if (!calendar) {
    return null;
  }

  return {
    year,
    totalContributions: calendar.totalContributions,
    heatmap: buildHeatmapFromContributionCalendar(calendar),
    activeDates: collectActiveDates(calendar),
  };
}

/** Fetches official GitHub contribution calendars for each year since account creation. */
export async function fetchGitHubContributions(
  login: string,
  createdAt?: string,
): Promise<ContributionsPayload | null> {
  const accountCreatedAt = createdAt ?? new Date().toISOString();
  const years = getContributionYears(accountCreatedAt);
  const [rollingYear, ...yearResults] = await Promise.all([
    fetchRollingYearCalendar(login),
    ...years.map((year) => fetchContributionYear(login, year)),
  ]);

  const validYears = yearResults.filter((result): result is ContributionsYearData => result !== null);
  if (!rollingYear && validYears.length === 0) {
    return null;
  }

  const heatmapByYear: Record<number, HeatmapCell[][]> = {};
  const totalsByYear: Record<number, number> = {};
  const activeDateSet = new Set<string>();

  for (const yearData of validYears) {
    heatmapByYear[yearData.year] = yearData.heatmap;
    totalsByYear[yearData.year] = yearData.totalContributions;
    for (const date of yearData.activeDates) {
      activeDateSet.add(date);
    }
  }

  const fallbackRolling: RollingYearCalendar | null =
    rollingYear ??
    (validYears[0]
      ? {
          totalContributions: validYears[0].totalContributions,
          heatmap: validYears[0].heatmap,
        }
      : null);

  if (!fallbackRolling) {
    return null;
  }

  return {
    years: validYears.map((entry) => entry.year),
    totalsByYear,
    heatmapByYear,
    rollingYear: fallbackRolling,
    activeDates: [...activeDateSet].sort(),
    source: "github_graphql",
  };
}
