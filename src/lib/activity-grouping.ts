import type { ActivityItem } from "@/types/github";

function toUTCDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Groups activity items by UTC ISO date (`YYYY-MM-DD`) for timeline rendering. */
export function groupActivitiesByDate(items: ActivityItem[]): Record<string, ActivityItem[]> {
  const grouped: Record<string, ActivityItem[]> = {};

  for (const item of items) {
    const date = new Date(item.createdAt);
    const dateKey = Number.isNaN(date.getTime()) ? item.createdAt.slice(0, 10) : toUTCDateKey(date);

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(item);
  }

  return grouped;
}
