/**
 * The brand's structural motif: ascending angled bars borrowed from the logo
 * (30-35 degrees). Used as an accent on the hero and the closing band only,
 * never as background clutter.
 */
export function AngledForms({
  className,
  flip = true,
  onDark = false,
}: {
  className?: string;
  /** Mirror horizontally in RTL so the bars still rise toward the reading end. */
  flip?: boolean;
  onDark?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 520 420"
      className={`${className ?? ""} ${flip ? "rtl-flip" : ""}`}
      fill="none"
    >
      <defs>
        <linearGradient id="af-navy" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: onDark ? "#1B4F8F" : "var(--af-a)" }} />
          <stop offset="1" style={{ stopColor: onDark ? "#2E73BD" : "var(--af-b)" }} />
        </linearGradient>
        <linearGradient id="af-teal" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0E9A7B" />
          <stop offset="1" stopColor="#10B991" />
        </linearGradient>
        <linearGradient id="af-mint" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#10B991" />
          <stop offset="1" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <g transform="rotate(-33 260 210)">
        <rect x="40" y="120" width="400" height="74" rx="20" fill="url(#af-navy)" />
        <rect x="120" y="214" width="380" height="74" rx="20" fill="url(#af-teal)" />
        <rect x="20" y="308" width="190" height="52" rx="16" fill="url(#af-mint)" />
      </g>
    </svg>
  );
}
