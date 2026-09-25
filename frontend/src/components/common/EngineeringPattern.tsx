interface EngineeringPatternProps {
  /**
   * Controls the tint and intensity of the pattern. Pass a text-color
   * utility (with an optional opacity modifier) — the SVG inherits it via
   * `currentColor`, the same pattern CompanyLogo uses for its themed group.
   * Defaults to a low-key white, safe on any dark panel.
   */
  className?: string;
}

/**
 * Drop-in replacement for GridShape/SealPattern. A plain grid reads as
 * generic dashboard chrome; this instead borrows the vocabulary a Provincial
 * Engineering Office's own drawings use:
 *  - a compass rose (cardinal/intercardinal spokes + degree ticks inside a
 *    ringed bezel) — a standard site-plan/survey element, and a natural
 *    stand-in for the logo's own engraved border ring and radiating rays
 *  - a dimension-line callout (arrowheads + extension ticks), the exact
 *    convention used to annotate a distance on a civil drawing
 *  - a couple of survey benchmark marks (circle + crosshair), the symbol
 *    used on site plans to mark a fixed reference point
 * Same corner-bleed placement and className API, so it's a straight swap.
 */
export default function EngineeringPattern({
  className = "text-white/10",
}: EngineeringPatternProps) {
  return (
    <>
      <div
        className={`absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[420px] ${className}`}
      >
        <EngineeringMotif />
      </div>
      <div
        className={`absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[420px] ${className}`}
      >
        <EngineeringMotif />
      </div>
    </>
  );
}

function EngineeringMotif() {
  const size = 420;
  // Center the compass rose toward one corner of its own box so most of the
  // ring bleeds off-canvas once placed, same trick GridShape used for lines.
  const cx = size * 0.69;
  const cy = size * 0.69;
  const outerR = size * 0.4;
  const innerR = outerR - 14;

  const cardinals = [0, 90, 180, 270];
  const intercardinals = [45, 135, 225, 315];
  const minorTicks = Array.from({ length: 36 }, (_, i) => i * 10).filter(
    (deg) => !cardinals.includes(deg) && !intercardinals.includes(deg),
  );

  const toPoint = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full"
    >
      <defs>
        <radialGradient id="engPatternFade" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Compass rose: bezel rings + cardinal/intercardinal spokes + degree ticks */}
      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1"
      />

      <g stroke="url(#engPatternFade)" strokeWidth="1.6" opacity="0.55">
        {cardinals.map((deg) => {
          const p = toPoint(deg, outerR);
          return <line key={deg} x1={cx} y1={cy} x2={p.x} y2={p.y} />;
        })}
      </g>
      <g stroke="currentColor" strokeOpacity="0.22" strokeWidth="1">
        {intercardinals.map((deg) => {
          const p = toPoint(deg, outerR * 0.86);
          return <line key={deg} x1={cx} y1={cy} x2={p.x} y2={p.y} />;
        })}
      </g>
      <g stroke="currentColor" strokeOpacity="0.28" strokeWidth="1">
        {minorTicks.map((deg) => {
          const a = toPoint(deg, outerR);
          const b = toPoint(deg, outerR - 8);
          return <line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>

      {/* Dimension-line callout: extension ticks + arrowheads + midpoint station mark */}
      <g stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5">
        <line x1="24" y1="20" x2="24" y2="52" />
        <line x1="176" y1="20" x2="176" y2="52" />
        <line x1="24" y1="40" x2="176" y2="40" />
        <line x1="100" y1="34" x2="100" y2="46" />
        <path d="M24 40 L34 35 M24 40 L34 45" />
        <path d="M176 40 L166 35 M176 40 L166 45" />
      </g>

      {/* Survey benchmark marks */}
      <g stroke="currentColor" strokeOpacity="0.26" strokeWidth="1.2">
        <circle cx="66" cy="150" r="7" />
        <line x1="56" y1="150" x2="76" y2="150" />
        <line x1="66" y1="140" x2="66" y2="160" />

        <circle cx="330" cy="70" r="6" />
        <line x1="321" y1="70" x2="339" y2="70" />
        <line x1="330" y1="61" x2="330" y2="79" />
      </g>
    </svg>
  );
}
