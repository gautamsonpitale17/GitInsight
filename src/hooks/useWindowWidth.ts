"use client";

import { useEffect, useState } from "react";

/** Default mobile breakpoint for charts (`sm` is 544px in this project). */
export const SM_BREAKPOINT = 640;

/** Tailwind `md` — heatmap horizontal scroll vs scale-to-fit. */
export const MD_BREAKPOINT = 768;

/** Tailwind `lg` — chart height steps (e.g. weekday bar chart). */
export const LG_BREAKPOINT = 1024;

export function useWindowWidth(): number {
  /** Desktop-first initial value avoids SSR/client hydration mismatches. */
  const [width, setWidth] = useState(SM_BREAKPOINT);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

export function useIsMobile(breakpoint = SM_BREAKPOINT): boolean {
  const width = useWindowWidth();
  return width < breakpoint;
}
