"use client";

import { useReportWebVitals } from "next/web-vitals";

const TRACKED_METRICS = new Set(["LCP", "FID", "CLS", "TTFB", "FCP"]);

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (!TRACKED_METRICS.has(metric.name)) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(metric);
      return;
    }

    void fetch("/api/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metric),
      keepalive: true,
    });
  });

  return null;
}
