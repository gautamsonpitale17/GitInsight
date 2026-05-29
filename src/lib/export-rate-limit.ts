import { CacheKeys, redis } from "@/lib/cache";
import { isRateLimitEnforced } from "@/lib/rate-limit-env";

export const EXPORT_RATE_LIMIT_MAX = 5;
export const EXPORT_RATE_LIMIT_WINDOW_SECONDS = 3600;

export interface ExportRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function normalizeIp(ip: string): string {
  return ip.toLowerCase().replace(/[^a-z0-9.:_-]/g, "_").slice(0, 128);
}

export async function checkExportRateLimit(ip: string): Promise<ExportRateLimitResult> {
  if (!isRateLimitEnforced()) {
    return {
      allowed: true,
      remaining: EXPORT_RATE_LIMIT_MAX,
      resetAt: Math.floor(Date.now() / 1000) + EXPORT_RATE_LIMIT_WINDOW_SECONDS,
    };
  }

  const key = CacheKeys.exportRateLimit(normalizeIp(ip));
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, EXPORT_RATE_LIMIT_WINDOW_SECONDS);
  }

  const ttl = await redis.ttl(key);
  const resetAt =
    Math.floor(Date.now() / 1000) +
    (ttl > 0 ? ttl : EXPORT_RATE_LIMIT_WINDOW_SECONDS);

  if (count > EXPORT_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  return {
    allowed: true,
    remaining: EXPORT_RATE_LIMIT_MAX - count,
    resetAt,
  };
}
