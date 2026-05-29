"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const EXIT_MS = 150;

type TransitionPhase = "visible" | "exiting" | "entering";

type PageTransitionProps = {
  children: ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<TransitionPhase>("visible");
  const [content, setContent] = useState(children);
  const routeKeyRef = useRef(pathname);
  const isInitialMount = useRef(true);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setContent(children);
      routeKeyRef.current = pathname;
      return;
    }

    if (pathname === routeKeyRef.current) {
      setContent(children);
      return;
    }

    if (prefersReducedMotion) {
      routeKeyRef.current = pathname;
      setContent(children);
      setPhase("visible");
      return;
    }

    setPhase("exiting");

    exitTimerRef.current = window.setTimeout(() => {
      routeKeyRef.current = pathname;
      setContent(children);
      setPhase("entering");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("visible");
        });
      });
    }, EXIT_MS);

    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [pathname, children, prefersReducedMotion]);

  return (
    <div
      className={cn(
        "page-transition flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        phase === "exiting" && "page-transition-exit",
        phase === "entering" && "page-transition-enter",
        phase === "visible" && "page-transition-visible",
        prefersReducedMotion && "page-transition-reduced",
      )}
    >
      {content}
    </div>
  );
}
