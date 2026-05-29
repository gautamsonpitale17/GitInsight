import { cacheFreshKey, CacheKeys, redis } from "@/lib/cache";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized(request: Request): boolean {
  const expected = process.env.CACHE_SECRET;
  if (!expected) {
    return false;
  }

  const provided = request.headers.get("X-Invalidate-Secret");
  return provided === expected;
}

function usernameKeys(username: string): string[] {
  const userKey = CacheKeys.user(username);
  const eventsKey = CacheKeys.events(username);

  return [
    userKey,
    cacheFreshKey(userKey),
    CacheKeys.repos(username),
    CacheKeys.languages(username),
    eventsKey,
    cacheFreshKey(eventsKey),
    CacheKeys.stars(username),
    CacheKeys.streaks(username),
    CacheKeys.network(username),
  ];
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username =
    typeof body === "object" && body !== null && "username" in body
      ? (body as { username: unknown }).username
      : undefined;

  if (typeof username !== "string" || !username.trim()) {
    return Response.json({ error: "username must be a non-empty string" }, { status: 400 });
  }

  const normalized = username.trim();
  const keys = usernameKeys(normalized);

  await redis.del(...keys);

  return Response.json({ invalidated: keys });
}
