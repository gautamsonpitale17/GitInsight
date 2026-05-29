"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export type ChartAnimationVariant = "bars" | "bars-horizontal" | "none";

type ChartInViewProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: ChartAnimationVariant;
};

function joinClasses(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function ChartInView({
  children,
  className,
  style,
  variant = "bars",
}: ChartInViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  const prefersReducedMotion = usePrefersReducedMotion();

  const animationClass =
    !prefersReducedMotion && variant === "bars"
      ? "chart-bars-enter"
      : !prefersReducedMotion && variant === "bars-horizontal"
        ? "chart-bars-horizontal-enter"
        : undefined;

  return (
    <div
      ref={ref}
      style={style}
      className={joinClasses(
        animationClass,
        isInView && !prefersReducedMotion && "is-inview",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function useChartInView() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref);
  const prefersReducedMotion = usePrefersReducedMotion();

  return { ref, isInView, prefersReducedMotion, animate: isInView && !prefersReducedMotion };
}
