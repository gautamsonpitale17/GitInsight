import { cn } from "@/lib/utils";

/** GitHub-style 80ms transition for buttons and inline links */
export const ghInteractiveTransition =
  "transition-[background-color,color,border-color] duration-[80ms] ease";

export const ghBtn = "gh-btn";
export const ghBtnPrimary = "gh-btn gh-btn-primary";
export const ghBtnSecondary = "gh-btn gh-btn-secondary";
export const ghBtnDanger = "gh-btn gh-btn-danger";
export const ghBtnSubtle = "gh-btn gh-btn-subtle";
export const ghLink = "gh-link";

export const ghBtnPrimaryMd = cn(
  ghBtnPrimary,
  "tap-target-mobile px-4 py-2 text-sm",
);

export const ghBtnSecondaryMd = cn(
  ghBtnSecondary,
  "tap-target-mobile px-4 py-2 text-sm shadow-sm",
);

export const ghBtnSecondarySm = cn(
  ghBtnSecondary,
  "tap-target-mobile gap-1.5 px-2.5 py-1.5 text-xs shadow-sm",
);

export const ghBtnSubtleSm = cn(
  ghBtnSubtle,
  "tap-target-mobile gap-1.5 px-2.5 py-1.5 text-xs",
);

export const ghBtnSubtleIcon = cn(
  ghBtnSubtle,
  "tap-target-mobile inline-flex h-8 w-8 shrink-0 p-0",
);
