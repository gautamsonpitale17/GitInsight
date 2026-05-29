import "server-only";

import { cache } from "react";
import {
  fetchDashboardActivity,
  fetchDashboardLanguages,
  fetchDashboardNetwork,
  fetchDashboardProfile,
  fetchDashboardRepos,
  fetchDashboardStarred,
  fetchDashboardStreaks,
} from "@/lib/analytics";

/** Request-scoped deduplication for parallel section streams. */
export const getDashboardProfile = cache(fetchDashboardProfile);
export const getDashboardActivity = cache(fetchDashboardActivity);
export const getDashboardLanguages = cache(fetchDashboardLanguages);
export const getDashboardRepos = cache(fetchDashboardRepos);
export const getDashboardStreaks = cache(fetchDashboardStreaks);
export const getDashboardNetwork = cache(fetchDashboardNetwork);
export const getDashboardStarred = cache(fetchDashboardStarred);
