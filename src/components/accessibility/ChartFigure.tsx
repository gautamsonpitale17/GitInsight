import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChartFigureProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  children: ReactNode;
};

/** Accessible chart wrapper: exposes a single `role="img"` description to assistive tech. */
export function ChartFigure({
  label,
  children,
  className,
  ...rest
}: ChartFigureProps) {
  return (
    <div role="img" aria-label={label} className={cn(className)} {...rest}>
      {children}
    </div>
  );
}
