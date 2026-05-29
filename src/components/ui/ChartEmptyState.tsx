import type { ReactNode } from "react";

type ChartEmptyStateProps = {
  message: string;
  icon?: ReactNode;
  className?: string;
};

export function ChartEmptyState({ message, icon, className }: ChartEmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-2 py-4 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <div className="flex items-center justify-center text-gh-gray-4 [&_svg]:h-8 [&_svg]:w-8">
          {icon}
        </div>
      ) : null}
      <p className="text-readable text-sm text-gh-gray-5">{message}</p>
    </div>
  );
}

export function InboxEmptyIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 14a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V14Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 16l14.5 10a2 2 0 0 0 2.2 0L39 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
