import { cacheFreshKey, CacheKeys, getRateLimitState, redis } from "@/lib/cache";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REDIS_KEY_MISSING_TTL = -2;

type CacheKeyStats = {
  hit: boolean;
  ttl: number;
};

type CacheStatsResponse = {
  keys: Record<string, CacheKeyStats>;
  rateLimit: Awaited<ReturnType<typeof getRateLimitState>>;
};

function isDebugRequest(request: Request): boolean {
  return request.headers.get("X-Debug") === "true";
}

async function getKeyStats(redisKey: string): Promise<CacheKeyStats> {
  const ttl = await redis.ttl(redisKey);
  return {
    hit: ttl !== REDIS_KEY_MISSING_TTL,
    ttl,
  };
}

function buildUsernameKeySpecs(username: string): Array<{ name: string; redisKey: string }> {
  const userKey = CacheKeys.user(username);
  const eventsKey = CacheKeys.events(username);

  return [
    { name: "user", redisKey: userKey },
    { name: "user:fresh", redisKey: cacheFreshKey(userKey) },
    { name: "repos", redisKey: CacheKeys.repos(username) },
    { name: "languages", redisKey: CacheKeys.languages(username) },
    { name: "events", redisKey: eventsKey },
    { name: "events:fresh", redisKey: cacheFreshKey(eventsKey) },
    { name: "stars", redisKey: CacheKeys.stars(username) },
    { name: "streaks", redisKey: CacheKeys.streaks(username) },
    { name: "network", redisKey: CacheKeys.network(username) },
  ];
}

export async function GET(request: Request) {
  if (!isDebugRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim();

  if (!username) {
    return Response.json({ error: "username query parameter is required" }, { status: 400 });
  }

  const keySpecs = buildUsernameKeySpecs(username);

  const [keyEntries, rateLimit] = await Promise.all([
    Promise.all(
      keySpecs.map(async ({ name, redisKey }) => {
        const stats = await getKeyStats(redisKey);
        return [name, stats] as const;
      }),
    ),
    getRateLimitState(),
  ]);

  const body: CacheStatsResponse = {
    keys: Object.fromEntries(keyEntries),
    rateLimit,
  };

  return Response.json(body, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
