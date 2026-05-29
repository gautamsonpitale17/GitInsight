import { cacheFreshKey, CacheKeys, redis } from "@/lib/cache";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

/** Clears cached dashboard data for a username (user-initiated refresh). */
export async function POST(request: Request) {
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

  return Response.json({ refreshed: true, username: normalized, invalidated: keys });
}
