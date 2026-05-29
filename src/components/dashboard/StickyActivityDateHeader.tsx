"use client";

import { useStickySentinel } from "@/hooks/useStickySentinel";
import { cn } from "@/lib/utils";

type StickyActivityDateHeaderProps = {
  children: React.ReactNode;
};

/** GitHub-style sticky day heading for activity / notification feeds. */
export function StickyActivityDateHeader({ children }: StickyActivityDateHeaderProps) {
  const { sentinelRef, isStuck } = useStickySentinel();

  return (
    <div className="activity-date-header-group">
      <div ref={sentinelRef} className="activity-date-header-sentinel" aria-hidden />
      <h3 className={cn("activity-date-header", isStuck && "is-stuck")}>{children}</h3>
    </div>
  );
}
