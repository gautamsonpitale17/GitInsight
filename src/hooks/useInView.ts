"use client";

import { useEffect, useState, type RefObject } from "react";

const DEFAULT_THRESHOLD = 0.1;

export function useInView(
  ref: RefObject<Element | null>,
  threshold: number = DEFAULT_THRESHOLD,
): boolean {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return isInView;
}
