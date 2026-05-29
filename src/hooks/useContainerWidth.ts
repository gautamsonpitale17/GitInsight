"use client";

import { useRef, type RefObject } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";

/** ~212px content width in a 1/3 dashboard grid slot at 1024px layout. */
export const NARROW_CONTAINER_WIDTH_PX = 240;

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const width = useElementWidth(ref as RefObject<HTMLElement | null>);
  const isNarrow = width > 0 && width < NARROW_CONTAINER_WIDTH_PX;

  return { ref, width, isNarrow };
}
