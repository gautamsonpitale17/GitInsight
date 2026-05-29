import {
  CacheKeys,
  type DashboardCacheSection,
  pipelineStoreCacheEntries,
  type PipelineCacheEntry,
} from "@/lib/cache";
import { isRateLimitEnforced } from "@/lib/rate-limit-env";

const WARM_ENDPOINTS = [
  { section: "profile", path: "user" },
  { section: "repos", path: "repos" },
  { section: "languages", path: "languages" },
  { section: "activity", path: "events" },
  { section: "contributions", path: "contributions" },
  { section: "streaks", path: "streaks" },
  { section: "network", path: "network" },
  { section: "starred", path: "stars" },
] as const satisfies ReadonlyArray<{ section: DashboardCacheSection; path: string }>;

const WARM_CACHE_TTLS: Record<
  DashboardCacheSection,
  { ttlSeconds: number; freshTtlSeconds?: number }
> = {
  profile: { ttlSeconds: 3000, freshTtlSeconds: 300 },
  repos: { ttlSeconds: 600 },
  languages: { ttlSeconds: 1800 },
  activity: { ttlSeconds: 1800, freshTtlSeconds: 180 },
  contributions: { ttlSeconds: 3600, freshTtlSeconds: 300 },
  streaks: { ttlSeconds: 300 },
  network: { ttlSeconds: 600 },
  starred: { ttlSeconds: 3600 },
};

function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

function getWarmCacheKey(section: DashboardCacheSection, username: string): string {
  switch (section) {
    case "profile":
      return CacheKeys.user(username);
    case "repos":
      return CacheKeys.repos(username);
    case "languages":
      return CacheKeys.languages(username);
    case "activity":
      return CacheKeys.events(username);
    case "contributions":
      return CacheKeys.contributions(username);
    case "streaks":
      return CacheKeys.streaks(username);
    case "network":
      return CacheKeys.network(username);
    case "starred":
      return CacheKeys.stars(username);
  }
}

function buildPipelineEntry(
  section: DashboardCacheSection,
  username: string,
  value: unknown,
): PipelineCacheEntry {
  const key = getWarmCacheKey(section, username);
  const ttl = WARM_CACHE_TTLS[section];

  if (ttl.freshTtlSeconds !== undefined) {
    return {
      key,
      value,
      ttlSeconds: ttl.ttlSeconds,
      freshTtlSeconds: ttl.freshTtlSeconds,
    };
  }

  return {
    key,
    value,
    ttlSeconds: ttl.ttlSeconds,
  };
}

async function warmGithubApiCacheAsync(username: string): Promise<void> {
  const baseUrl = getAppBaseUrl();
  const query = `username=${encodeURIComponent(username)}`;

  const settled = await Promise.allSettled(
    WARM_ENDPOINTS.map(async ({ section, path }) => {
      const response = await fetch(`${baseUrl}/api/github/${path}?${query}`, {
        cache: "no-store",
        headers: { "X-Cache-Warm": "true" },
      });

      if (!response.ok) {
        throw new Error(`${path} returned ${response.status}`);
      }

      return {
        section,
        data: (await response.json()) as unknown,
      };
    }),
  );

  const pipelineEntries: PipelineCacheEntry[] = [];

  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") {
      continue;
    }

    pipelineEntries.push(
      buildPipelineEntry(outcome.value.section, username, outcome.value.data),
    );
  }

  await pipelineStoreCacheEntries(pipelineEntries);
}

/**
 * Fire-and-forget fetches to populate Redis for all dashboard GitHub API routes.
 * Writes are batched into a single Redis pipeline (Phase 4.9).
 */
export function warmGithubApiCache(username: string): void {
  if (!isRateLimitEnforced()) {
    return;
  }

  void warmGithubApiCacheAsync(username).catch(() => {
    // Warming is best-effort; failures must not affect the user response.
  });
}
