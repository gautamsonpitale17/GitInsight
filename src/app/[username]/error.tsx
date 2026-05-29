"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OctocatIllustration } from "@/components/dashboard/OctocatIllustration";
import {
  getErrorResetAt,
  isRateLimitError,
  isUserNotFoundError,
} from "@/lib/dashboard-errors";
import {
  formatRateLimitMessage,
  formatUserErrorMessage,
  RATE_LIMIT_TITLE,
  USER_NOT_FOUND_TITLE,
} from "@/lib/format";
import {
  ghBtnPrimaryMd,
  ghBtnSecondaryMd,
  ghLink,
} from "@/lib/interactive-classes";

type UsernameDashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getRemainingMs(resetAt: string): number {
  const target = new Date(resetAt).getTime();
  if (Number.isNaN(target)) {
    return 0;
  }
  return Math.max(0, target - Date.now());
}

function RateLimitCountdown({ resetAt }: { resetAt: string }) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(resetAt));

  useEffect(() => {
    setRemainingMs(getRemainingMs(resetAt));
    const intervalId = window.setInterval(() => {
      setRemainingMs(getRemainingMs(resetAt));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [resetAt]);

  return (
    <p className="mt-2 text-sm text-gh-gray-5">
      Resets in{" "}
      <span className="font-mono font-semibold text-gh-gray-7">
        {formatCountdown(remainingMs)}
      </span>
    </p>
  );
}

export default function UsernameDashboardError({
  error,
  reset,
}: UsernameDashboardErrorProps) {
  const router = useRouter();
  const resetAt = getErrorResetAt(error);
  const showUserNotFound = isUserNotFoundError(error);
  const showRateLimit = isRateLimitError(error);

  const title = showUserNotFound
    ? USER_NOT_FOUND_TITLE
    : showRateLimit
      ? RATE_LIMIT_TITLE
      : "Something went wrong";

  const description = formatUserErrorMessage(error.message, resetAt);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-12 text-center sm:py-16">
      <OctocatIllustration className="h-40 w-40 sm:h-48 sm:w-48" />

      <h1 className="mt-6 text-gh-gray-7">
        {title}
      </h1>

      <p className="text-readable mt-3 text-sm leading-relaxed text-gh-gray-5">
        {description}
      </p>

      {showRateLimit && resetAt ? <RateLimitCountdown resetAt={resetAt} /> : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className={ghBtnSecondaryMd}
        >
          Try another username
        </button>
        <button
          type="button"
          onClick={reset}
          className={ghBtnPrimaryMd}
        >
          Retry
        </button>
      </div>

      <p className="mt-6 text-sm text-gh-gray-4">
        Or return to{" "}
        <Link href="/" className={`${ghLink} font-medium`}>
          Home
        </Link>
      </p>
    </div>
  );
}
