import "server-only";

import { Redis } from "@upstash/redis/cloudflare";

function createRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return new Redis({ url, token });
  }

  return {
    get: async () => null,
    mget: async (...keys: string[]) => keys.map(() => null),
    setex: async () => "OK",
    pipeline: () => {
      const chain = {
        setex() {
          return chain;
        },
        async exec() {
          return [];
        },
      };
      return chain;
    },
  } as unknown as Redis;
}

let redisClient: Redis | undefined;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/** @deprecated Use {@link getRedis}; kept for existing imports. */
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, property, receiver) {
    return Reflect.get(getRedis(), property, receiver);
  },
});

export const CacheKeys = {
  user: (username: string) => `gi:user:${username.toLowerCase()}`,
  repos: (username: string) => `gi:repos:${username.toLowerCase()}`,
  languages: (username: string) => `gi:langs:${username.toLowerCase()}`,
  events: (username: string) => `gi:events:${username.toLowerCase()}`,
  stars: (username: string) => `gi:stars:${username.toLowerCase()}`,
  streaks: (username: string) => `gi:streaks:${username.toLowerCase()}`,
  contributions: (username: string) => `gi:contributions:${username.toLowerCase()}`,
  network: (username: string) => `gi:network:${username.toLowerCase()}`,
  rateLimit: () => "gi:ratelimit:global",
  exportRateLimit: (ip: string) => `gi:export:${ip}`,
} as const;

export type CacheStatus = "HIT" | "STALE" | "MISS";

export type DashboardCacheSection =
  | "profile"
  | "repos"
  | "languages"
  | "activity"
  | "contributions"
  | "streaks"
  | "network"
  | "starred";

const DASHBOARD_CACHE_SECTIONS: readonly DashboardCacheSection[] = [
  "profile",
  "repos",
  "languages",
  "activity",
  "contributions",
  "streaks",
  "network",
  "starred",
] as const;

const DASHBOARD_SECTION_REDIS_KEY: Record<
  DashboardCacheSection,
  (username: string) => string
> = {
  profile: CacheKeys.user,
  repos: CacheKeys.repos,
  languages: CacheKeys.languages,
  activity: CacheKeys.events,
  contributions: CacheKeys.contributions,
  streaks: CacheKeys.streaks,
  network: CacheKeys.network,
  starred: CacheKeys.stars,
};

const SWR_DASHBOARD_SECTIONS = new Set<DashboardCacheSection>(["profile", "activity"]);

const REDIS_COLD_CONNECTION_MS = 2_000;
const warnedColdRedisOperations = new Set<string>();

export function cacheFreshKey(key: string): string {
  return `${key}:fresh`;
}

export function isCacheWarmRequest(request: Request): boolean {
  return request.headers.get("X-Cache-Warm") === "true";
}

export interface CacheOptions {
  skipWrite?: boolean;
}

export interface DashboardCacheEntry<T = unknown> {
  data: T | null;
  status: CacheStatus;
}

export type DashboardCacheBatch = Record<DashboardCacheSection, DashboardCacheEntry>;

export interface PipelineCacheEntry {
  key: string;
  value: unknown;
  ttlSeconds: number;
  freshTtlSeconds?: number;
}

interface RateLimitState {
  remaining: number;
  resetAt: number;
}

function warnIfColdRedisConnection(operation: string, durationMs: number): void {
  if (
    process.env.NODE_ENV !== "development" ||
    durationMs <= REDIS_COLD_CONNECTION_MS ||
    warnedColdRedisOperations.has(operation)
  ) {
    return;
  }

  warnedColdRedisOperations.add(operation);
  console.warn(
    `[redis] Slow Redis request (${durationMs.toFixed(0)}ms) during ${operation}. Subsequent calls are not logged.`,
  );
}

async function withRedisConnectionCheck<T>(
  operation: string,
  action: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await action();
  } finally {
    warnIfColdRedisConnection(operation, performance.now() - startedAt);
  }
}

function resolveSWRStatus(value: unknown, isFresh: unknown): CacheStatus {
  if (value === null) {
    return "MISS";
  }

  if (isFresh !== null) {
    return "HIT";
  }

  return "STALE";
}

function resolveSimpleStatus(value: unknown): CacheStatus {
  return value === null ? "MISS" : "HIT";
}

function buildDashboardMgetKeys(username: string): {
  keys: string[];
  sectionKeyIndex: Record<DashboardCacheSection, number>;
  freshKeyIndex: Partial<Record<DashboardCacheSection, number>>;
} {
  const keys: string[] = [];
  const sectionKeyIndex = {} as Record<DashboardCacheSection, number>;
  const freshKeyIndex: Partial<Record<DashboardCacheSection, number>> = {};

  for (const section of DASHBOARD_CACHE_SECTIONS) {
    sectionKeyIndex[section] = keys.length;
    keys.push(DASHBOARD_SECTION_REDIS_KEY[section](username));

    if (SWR_DASHBOARD_SECTIONS.has(section)) {
      freshKeyIndex[section] = keys.length;
      keys.push(cacheFreshKey(DASHBOARD_SECTION_REDIS_KEY[section](username)));
    }
  }

  return { keys, sectionKeyIndex, freshKeyIndex };
}

/** Batch-read all 7 dashboard cache keys (plus SWR fresh markers) in one mget. */
export async function getDashboardCacheBatch(username: string): Promise<DashboardCacheBatch> {
  const normalizedUsername = username.trim();
  const { keys, sectionKeyIndex, freshKeyIndex } = buildDashboardMgetKeys(normalizedUsername);

  const values = await withRedisConnectionCheck("dashboard mget", () => redis.mget(...keys));

  const batch = {} as DashboardCacheBatch;

  for (const section of DASHBOARD_CACHE_SECTIONS) {
    const value = values[sectionKeyIndex[section]] ?? null;
    const freshIndex = freshKeyIndex[section];
    const status =
      freshIndex === undefined
        ? resolveSimpleStatus(value)
        : resolveSWRStatus(value, values[freshIndex] ?? null);

    batch[section] = {
      data: value === null ? null : value,
      status,
    };
  }

  return batch;
}

export async function pipelineStoreCacheEntries(entries: PipelineCacheEntry[]): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  await withRedisConnectionCheck("dashboard cache pipeline", async () => {
    const pipeline = redis.pipeline();

    for (const entry of entries) {
      pipeline.setex(entry.key, entry.ttlSeconds, entry.value);
      if (entry.freshTtlSeconds !== undefined) {
        pipeline.setex(cacheFreshKey(entry.key), entry.freshTtlSeconds, 1);
      }
    }

    await pipeline.exec();
  });
}

export async function getRateLimitState(): Promise<RateLimitState | null> {
  const state = await redis.get<RateLimitState>(CacheKeys.rateLimit());
  return state ?? null;
}

export async function setRateLimitState(remaining: number, resetAt: number): Promise<void> {
  const ttlSeconds = Math.max(1, resetAt - Math.floor(Date.now() / 1000));
  await redis.setex(CacheKeys.rateLimit(), ttlSeconds, { remaining, resetAt });
}

const inFlight = new Map<string, Promise<unknown>>();

/** Coalesces concurrent fetches for the same key (e.g. parallel dashboard sections). */
export async function dedupeInFlightRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (inFlight.has(key)) {
    return (await inFlight.get(key)) as T;
  }

  const promise = fetcher();
  inFlight.set(key, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export async function cache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  options?: CacheOptions,
): Promise<{ data: T; status: CacheStatus }> {
  const cached = await redis.get<T>(key);
  if (cached !== null) {
    return { data: cached, status: "HIT" };
  }

  const fresh = await dedupeInFlightRequest(key, fetcher);
  if (!options?.skipWrite) {
    await redis.setex(key, ttlSeconds, fresh);
  }
  return { data: fresh, status: "MISS" };
}

async function storeSWRValue<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  staleTtlSeconds: number,
): Promise<void> {
  await pipelineStoreCacheEntries([
    { key, value, ttlSeconds: staleTtlSeconds, freshTtlSeconds: ttlSeconds },
  ]);
}

function scheduleBackgroundRevalidation<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  staleTtlSeconds: number,
): void {
  const revalidate = () => {
    void fetcher()
      .then((fresh) => storeSWRValue(key, fresh, ttlSeconds, staleTtlSeconds))
      .catch(() => {
        // Keep serving stale data if background revalidation fails.
      });
  };

  if (typeof setImmediate === "function") {
    setImmediate(revalidate);
  } else {
    void Promise.resolve().then(revalidate);
  }
}

export async function cacheWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  staleTtlSeconds: number,
  options?: CacheOptions,
): Promise<{ data: T; status: CacheStatus }> {
  const freshKey = cacheFreshKey(key);
  const [value, isFresh] = await Promise.all([redis.get<T>(key), redis.get(freshKey)]);

  if (isFresh !== null && value !== null) {
    return { data: value, status: "HIT" };
  }

  if (value !== null) {
    scheduleBackgroundRevalidation(key, fetcher, ttlSeconds, staleTtlSeconds);
    return { data: value, status: "STALE" };
  }

  const fresh = await fetcher();
  if (!options?.skipWrite) {
    await storeSWRValue(key, fresh, ttlSeconds, staleTtlSeconds);
  }
  return { data: fresh, status: "MISS" };
}
