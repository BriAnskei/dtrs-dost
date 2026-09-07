interface CompanyLogoProps {
  className?: string;
  size?: number;
  /**
   * When true, force the logo to use the light‑mode colour scheme even if the
   * surrounding UI is in dark mode. Useful for pages like the sign‑in view where
   * the design calls for a consistently light logo.
   */
  forceLight?: boolean;
}

export default function CompanyLogo({
  className = "",
  size = 180,
  forceLight = false,
}: CompanyLogoProps) {
  const teeth = Array.from({ length: 10 });

  // Determine the colour class based on the `forceLight` prop. In normal mode we
  // let Tailwind switch the colour for dark mode (white in light, gray‑200 in dark).
  const colourClass = forceLight ? "text-white" : "text-gray-800 dark:text-white";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={`${colourClass} ${className}`}
    >
      <defs>
        <path id="topArc" d="M 30,105 A 70,70 0 1,1 170,105" fill="none" />
      </defs>

      {/* Outer rings */}
      <circle
        cx="100"
        cy="100"
        r="96"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <circle
        cx="100"
        cy="100"
        r="88"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
      />
      <circle
        cx="100"
        cy="100"
        r="80"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
      />

      {/* Curved title */}
      <text fill="currentColor" fontSize="10.5" fontWeight="600" letterSpacing="2">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          PROVINCIAL ENGINEERING
        </textPath>
      </text>

      {/* Laurel branches */}
      {Array.from({ length: 6 }).map((_, i) => {
        const y = 150 + i * 6;
        return (
          <ellipse
            key={`left-${i}`}
            cx={70 - i * 4}
            cy={y}
            rx="6"
            ry="3"
            transform={`rotate(${-20 - i * 6} ${70 - i * 4} ${y})`}
            fill="var(--color-accent)"
            opacity="0.9"
          />
        );
      })}
      {Array.from({ length: 6 }).map((_, i) => {
        const y = 150 + i * 6;
        return (
          <ellipse
            key={`right-${i}`}
            cx={130 + i * 4}
            cy={y}
            rx="6"
            ry="3"
            transform={`rotate(${20 + i * 6} ${130 + i * 4} ${y})`}
            fill="var(--color-accent)"
            opacity="0.9"
          />
        );
      })}

      {/* Base / steps */}
      <line
        x1="55"
        y1="148"
        x2="145"
        y2="148"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.7"
      />
      <rect x="62" y="140" width="76" height="8" fill="currentColor" opacity="0.85" />
      <rect x="67" y="132" width="66" height="8" fill="currentColor" opacity="0.9" />

      {/* Columns */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={`col-${i}`}
          x={72 + i * 14}
          y="100"
          width="6"
          height="32"
          fill="currentColor"
        />
      ))}

      {/* Entablature + pediment */}
      <rect x="66" y="94" width="68" height="6" fill="currentColor" />
      <polygon points="100,68 64,94 136,94" fill="currentColor" />

      {/* Gear above the pediment — the "engineering" mark */}
      <g transform="translate(100,52)">
        <circle r="13" fill="none" stroke="var(--color-accent)" strokeWidth="4" />
        <circle r="4.5" fill="var(--color-accent)" />
        {teeth.map((_, i) => {
          const angle = (360 / teeth.length) * i;
          return (
            <rect
              key={`tooth-${i}`}
              x="-2"
              y="-18"
              width="4"
              height="6"
              fill="var(--color-accent)"
              transform={`rotate(${angle})`}
            />
          );
        })}
      </g>
    </svg>
  );
}
