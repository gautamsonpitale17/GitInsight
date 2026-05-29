"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GITHUB_API_TIMEOUT_MESSAGE } from "@/lib/dashboard-errors";
import { formatUserErrorMessage } from "@/lib/format";

const TIMEOUT_AUTO_RETRY_MS = 5000;

type SectionErrorStateProps = {
  message: string;
  resetAt?: string | null;
};

export function SectionErrorState({ message, resetAt }: SectionErrorStateProps) {
  const router = useRouter();
  const isTimeout = message === GITHUB_API_TIMEOUT_MESSAGE;
  const displayMessage = formatUserErrorMessage(message, resetAt);

  useEffect(() => {
    if (!isTimeout) {
      return;
    }

    const retryId = window.setTimeout(() => {
      router.refresh();
    }, TIMEOUT_AUTO_RETRY_MS);

    return () => window.clearTimeout(retryId);
  }, [isTimeout, router]);

  return (
    <p className="text-readable text-sm text-red-700" role="alert">
      {displayMessage}
    </p>
  );
}
