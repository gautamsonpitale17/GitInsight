import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type SectionProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  /** When true, omits outer card styles (for use inside DashboardGrid cells). */
  embedded?: boolean;
  /** When false, omits the horizontal rule under the section heading. */
  headerDivider?: boolean;
};

export function Section({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  action,
  embedded = false,
  headerDivider = true,
}: SectionProps) {
  const header = (
    <>
      <div
        className={cn(
          "flex items-start justify-between gap-4 pb-4",
          headerDivider && "border-b border-[var(--color-border-default)]",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {Icon ? (
              <Icon className="h-4 w-4 shrink-0 text-gh-gray-5" aria-hidden />
            ) : null}
            {/* github.com profile section headings (.h4) — 16px / 600 / 24px */}
            <h2 className="text-gh-h3 text-gh-gray-7">{title}</h2>
          </div>
          {subtitle ? (
            <p className="text-gh-caption mt-1">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-center">{action}</div> : null}
      </div>
      <div
        className={cn(
          "section-card-body",
          !headerDivider && "pt-1",
        )}
      >
        {children}
      </div>
    </>
  );

  if (embedded) {
    return (
      <section className={cn("w-full min-w-0 bg-transparent p-0", className)}>
        {header}
      </section>
    );
  }

  return (
    <Card as="section" className={className}>
      {header}
    </Card>
  );
}

/** Subsection label inside a card (16px above, 12px below — grid-aligned). */
export function SectionSubheading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "section-in-card-title text-xs font-semibold uppercase tracking-wide text-gh-gray-5",
        className,
      )}
    >
      {children}
    </h3>
  );
}
