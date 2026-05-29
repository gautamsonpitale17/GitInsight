export const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "repositories", label: "Repositories" },
  { id: "commits", label: "Commits" },
  { id: "streak", label: "Streak stats" },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]["id"];

const PROFILE_TAB_IDS = new Set<string>(PROFILE_TABS.map((tab) => tab.id));

export function parseProfileTab(value: string | string[] | undefined): ProfileTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && PROFILE_TAB_IDS.has(raw)) {
    return raw as ProfileTabId;
  }
  return "overview";
}

export function profileTabHref(username: string, tab: ProfileTabId): string {
  if (tab === "overview") {
    return `/${encodeURIComponent(username)}`;
  }
  return `/${encodeURIComponent(username)}?tab=${tab}`;
}
