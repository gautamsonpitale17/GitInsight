"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.mjs";
import { GitHubMark } from "@/components/GitHubMark";
import { useTheme } from "@/components/ThemeProvider";
import { DEFAULT_THEME } from "@/lib/theme-constants";
import { cn } from "@/lib/utils";

const RESERVED_TOP_LEVEL = new Set(["about"]);

function isProfileDashboardPath(pathname: string): boolean {
  const segment = pathname.split("/").filter(Boolean)[0];
  return Boolean(segment) && !RESERVED_TOP_LEVEL.has(segment);
}

export function SiteHeader() {
  const pathname = usePathname();
  const showBack = isProfileDashboardPath(pathname);
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const current =
    mounted && (theme === "light" || theme === "dark") ? theme : DEFAULT_THEME;
  const upcoming = current === "light" ? "dark" : "light";

  const toggleTheme = useCallback(() => {
    setTheme(upcoming);
  }, [setTheme, upcoming]);

  return (
    <div
      className={cn(
        "no-print fixed z-50 flex items-center gap-1",
        "top-[var(--site-header-top)] left-[var(--site-header-inset-left)]",
      )}
    >
      {showBack ? (
        <Link
          href="/"
          data-testid="dashboard-back"
          className={cn(
            "inline-flex shrink-0 items-center justify-center p-2 text-gh-gray-5",
            "transition-colors duration-[80ms] ease hover:text-gh-gray-7",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gh-green",
            "tap-target-mobile",
          )}
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
      ) : null}

      <button
        type="button"
        onClick={toggleTheme}
        disabled={!mounted}
        data-testid="site-logo"
        className={cn(
          "relative inline-flex items-center justify-center p-2",
          "transition-opacity duration-[80ms] ease hover:opacity-80",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gh-green",
          "tap-target-mobile",
        )}
        aria-label={
          mounted
            ? `GitInsight. Theme: ${current}. Switch to ${upcoming}`
            : "GitInsight"
        }
        title={
          mounted ? `${current} — switch to ${upcoming}` : "GitInsight"
        }
      >
        <GitHubMark className="h-8 w-8 text-fg-default" />
      </button>
    </div>
  );
}
