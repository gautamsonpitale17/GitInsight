"use client";

import { useId, useState } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import type { CompletenessResult } from "@/lib/analytics-types";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  bio: "Bio",
  avatar: "Custom avatar",
  location: "Location",
  website: "Website",
  company: "Company",
  twitter_username: "X (Twitter)",
  public_repos: "5+ public repos",
};

type ProfileCompletenessSectionProps = {
  result: CompletenessResult;
};

export function ProfileCompletenessSection({ result }: ProfileCompletenessSectionProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const missingCount = result.missing.length;
  const missingLabel =
    missingCount === 1 ? "1 field missing" : `${missingCount} fields missing`;

  return (
    <Card interactive className="no-print overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="gh-btn gh-btn-subtle tap-target-mobile flex w-full justify-between gap-2 rounded-none px-4 py-3 text-left text-sm text-gh-gray-7 max-sm:min-h-11"
      >
        <span className="font-medium">
          Profile Score: {result.score}/100 — {missingLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gh-gray-4 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="space-y-3 border-t border-gh-gray-2 px-4 py-3 text-sm text-gh-gray-6"
        >
          {result.missing.length > 0 ? (
            <div>
              <p className="font-medium text-gh-gray-7">Missing</p>
              <ul className="mt-1 list-inside list-disc text-gh-gray-5">
                {result.missing.map((field) => (
                  <li key={field}>{FIELD_LABELS[field] ?? field}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-readable text-gh-gray-5">
              Your profile has all tracked fields filled in.
            </p>
          )}

          {result.tips.length > 0 ? (
            <div>
              <p className="font-medium text-gh-gray-7">Tips to improve</p>
              <ul className="mt-1 space-y-1.5 text-gh-gray-5">
                {result.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
