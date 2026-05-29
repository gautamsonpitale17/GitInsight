"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  getPathnameFromHref,
  isSameOriginNavigation,
  onNavigationStart,
} from "@/lib/navigation-events";
import { cn } from "@/lib/utils";

const PROGRESS_TO_LOADING = 80;
const FADE_OUT_MS = 300;

type BarPhase = "hidden" | "loading" | "completing" | "fading";

export function NavigationProgress() {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<BarPhase>("hidden");
  const [progress, setProgress] = useState(0);
  const phaseRef = useRef<BarPhase>("hidden");
  const prevPathnameRef = useRef(pathname);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const setPhaseSafe = useCallback((next: BarPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const start = useCallback(() => {
    if (prefersReducedMotion) {
      return;
    }

    clearTimers();
    setProgress(0);
    setPhaseSafe("loading");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setProgress(PROGRESS_TO_LOADING);
      });
    });
  }, [clearTimers, prefersReducedMotion, setPhaseSafe]);

  const finish = useCallback(() => {
    if (prefersReducedMotion || phaseRef.current === "hidden") {
      return;
    }

    clearTimers();
    setProgress(100);
    setPhaseSafe("completing");

    schedule(() => {
      setPhaseSafe("fading");
      schedule(() => {
        setPhaseSafe("hidden");
        setProgress(0);
      }, FADE_OUT_MS);
    }, 80);
  }, [clearTimers, prefersReducedMotion, schedule, setPhaseSafe]);

  useEffect(() => onNavigationStart(start), [start]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || !isSameOriginNavigation(anchor)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href) {
        return;
      }

      const nextPath = getPathnameFromHref(href);
      if (nextPath === window.location.pathname) {
        return;
      }

      start();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [start]);

  useEffect(() => {
    if (pathname === prevPathnameRef.current) {
      return;
    }

    prevPathnameRef.current = pathname;

    if (prefersReducedMotion) {
      return;
    }

    if (phaseRef.current === "loading") {
      finish();
      return;
    }

    start();
    schedule(() => finish(), 0);
  }, [pathname, prefersReducedMotion, start, finish, schedule]);

  useEffect(() => clearTimers, [clearTimers]);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div
      className={cn(
        "no-print navigation-progress pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]",
        phase === "fading" && "navigation-progress-fade",
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Page loading"
    >
      <div
        className={cn(
          "navigation-progress-bar h-full origin-left bg-gh-green",
          phase === "completing" && "navigation-progress-bar-complete",
        )}
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
