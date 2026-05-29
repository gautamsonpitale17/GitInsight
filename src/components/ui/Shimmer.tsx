import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ShimmerProps = HTMLAttributes<HTMLDivElement>;

/** Skeleton placeholder with left-to-right shimmer sweep. */
export function Shimmer({ className, style, ...props }: ShimmerProps) {
  return (
    <div
      className={cn("shimmer-box", className)}
      style={style}
      aria-hidden
      {...props}
    />
  );
}
