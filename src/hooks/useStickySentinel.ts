"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detects when a sticky header is pinned using a 1px sentinel placed above it.
 * When the sentinel scrolls out of view, `isStuck` becomes true.
 */
export function useStickySentinel() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, isStuck };
}
