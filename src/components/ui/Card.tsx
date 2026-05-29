import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardPadding = "sm" | "md" | "lg" | "none";

export type CardProps<T extends ElementType = "div"> = {
  children: ReactNode;
  className?: string;
  /** sm = 12px, md = 16px (default), lg = 24px */
  padding?: CardPadding;
  noBorder?: boolean;
  /** Subtle border emphasis on hover (interactive / clickable cards). */
  interactive?: boolean;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const paddingClass: Record<CardPadding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
  none: "",
};

export function Card<T extends ElementType = "div">({
  children,
  className,
  padding = "md",
  noBorder = false,
  interactive = false,
  as,
  ...rest
}: CardProps<T>) {
  const Component = as ?? "div";

  // github.com .Box — border-radius 6px, 1px border rgb(209,217,224), padding 16px (md)
  return (
    <Component
      {...rest}
      className={cn(
        "min-w-0 rounded-card bg-[var(--color-canvas-default)]",
        !noBorder && "border border-[var(--color-border-default)]",
        !noBorder &&
          interactive &&
          "transition-[border-color] duration-gh hover:border-[var(--color-border-muted)]",
        paddingClass[padding],
        className,
      )}
    >
      {children}
    </Component>
  );
}
