"use client";

import { useEffect, useState, type RefObject } from "react";

/** Tracks `contentBoxSize.inlineSize` via ResizeObserver (0 when unmounted). */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = (inlineSize: number) => {
      setWidth(inlineSize);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const boxSize = entry.contentBoxSize;
      const inlineSize = boxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      update(inlineSize);
    });

    observer.observe(element);
    update(element.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}
