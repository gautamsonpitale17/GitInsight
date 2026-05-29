type OctocatIllustrationProps = {
  className?: string;
};

/** Inline Octocat-style mascot for GitHub-inspired error states. */
export function OctocatIllustration({ className }: OctocatIllustrationProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse
        cx="100"
        cy="178"
        rx="72"
        ry="10"
        fill="var(--color-border-default)"
        opacity="0.5"
      />
      <path
        d="M100 28c-28 0-50 20-50 48 0 14 5 27 14 36l-8 30 22-12c7 3 14 5 22 5s15-2 22-5l22 12-8-30c9-9 14-22 14-36 0-28-22-48-50-48Z"
        fill="var(--color-canvas-subtle)"
        stroke="var(--color-border-default)"
        strokeWidth="2"
      />
      <circle cx="78" cy="72" r="10" fill="var(--color-fg-default)" />
      <circle cx="122" cy="72" r="10" fill="var(--color-fg-default)" />
      <circle cx="81" cy="69" r="3" fill="var(--color-canvas-default)" />
      <circle cx="125" cy="69" r="3" fill="var(--color-canvas-default)" />
      <path
        d="M88 96c4 6 10 9 12 9s8-3 12-9"
        stroke="var(--color-fg-muted)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M48 88c-8 4-14 12-16 22M152 88c8 4 14 12 16 22"
        stroke="var(--color-border-default)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M62 118c-6 10-8 22-6 34M138 118c6 10 8 22 6 34"
        stroke="var(--color-border-default)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="100" cy="28" r="6" fill="var(--gh-green)" />
    </svg>
  );
}
