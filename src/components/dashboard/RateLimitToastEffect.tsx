"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { RATE_LIMIT_MESSAGE } from "@/lib/dashboard-errors";

type RateLimitToastEffectProps = {
  username: string;
};

function sessionKey(username: string): string {
  return `gitinsight-rate-limit-toast:${username.toLowerCase()}`;
}

/** Shows a toast when GitHub API rate limits but cached dashboard data is still shown. */
export function RateLimitToastEffect({ username }: RateLimitToastEffectProps) {
  const { info } = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const login = username.trim();
    if (!login || shownRef.current) {
      return;
    }

    const storageKey = sessionKey(login);
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(storageKey)) {
      shownRef.current = true;
      return;
    }

    let cancelled = false;

    async function probeRateLimit() {
      const endpoints = ["user", "events"] as const;

      for (const path of endpoints) {
        if (cancelled || shownRef.current) {
          return;
        }

        try {
          const response = await fetch(
            `/api/github/${path}?username=${encodeURIComponent(login)}`,
            { cache: "no-store" },
          );

          const cacheStatus = response.headers.get("X-Cache");
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;

          const isRateLimited =
            response.status === 429 || body?.error === RATE_LIMIT_MESSAGE;
          const servingStaleCache = response.ok && cacheStatus === "STALE";

          if (isRateLimited || servingStaleCache) {
            shownRef.current = true;
            sessionStorage.setItem(storageKey, "1");
            info("Rate limit reached — showing cached data");
            return;
          }
        } catch {
          // Ignore probe failures.
        }
      }
    }

    void probeRateLimit();

    return () => {
      cancelled = true;
    };
  }, [info, username]);

  return null;
}
