import { redis } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKED_METRICS = new Set(["LCP", "FID", "CLS", "TTFB", "FCP"]);
const LCP_ALERT_THRESHOLD_MS = 2500;
const VITALS_REDIS_TTL_SECONDS = 86_400;
const VITALS_REDIS_MAX_ENTRIES = 1000;

type WebVitalMetric = {
  id: string;
  name: string;
  value: number;
  rating?: string;
  navigationType?: string;
  delta?: number;
  entries?: unknown[];
};

function isWebVitalMetric(value: unknown): value is WebVitalMetric {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metric = value as WebVitalMetric;
  return (
    typeof metric.id === "string" &&
    typeof metric.name === "string" &&
    typeof metric.value === "number" &&
    Number.isFinite(metric.value)
  );
}

async function storeMetricInRedis(metric: WebVitalMetric): Promise<void> {
  const key = `gi:vitals:${metric.name.toLowerCase()}`;
  const payload = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    recordedAt: new Date().toISOString(),
  });

  await redis.lpush(key, payload);
  await redis.ltrim(key, 0, VITALS_REDIS_MAX_ENTRIES - 1);
  await redis.expire(key, VITALS_REDIS_TTL_SECONDS);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isWebVitalMetric(body) || !TRACKED_METRICS.has(body.name)) {
    return Response.json({ error: "Unsupported web vital metric" }, { status: 400 });
  }

  const metric = body;

  console.log("[web-vitals]", {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    id: metric.id,
  });

  if (metric.name === "LCP" && metric.value > LCP_ALERT_THRESHOLD_MS) {
    console.warn(
      `[web-vitals] LCP exceeded ${LCP_ALERT_THRESHOLD_MS}ms: ${metric.value.toFixed(0)}ms`,
    );
  }

  try {
    await storeMetricInRedis(metric);
  } catch (error) {
    console.warn("[web-vitals] Redis store failed:", error);
  }

  return Response.json({ ok: true });
}
