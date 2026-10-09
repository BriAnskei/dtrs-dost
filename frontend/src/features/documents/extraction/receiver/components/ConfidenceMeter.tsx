import {
  getConfidenceLevel,
  LEVEL_STYLES,
  toPercent,
} from "../helpers/reciever-upload-confidence";

interface Props {
  label: string;
  value: number | null;
  /** Makes the Effective score visually dominant. */
  emphasized?: boolean;
  hint?: string;
}

export default function ConfidenceMeter({
  label,
  value,
  emphasized = false,
  hint,
}: Props) {
  const pct = toPercent(value);
  const level = getConfidenceLevel(pct);
  const styles = LEVEL_STYLES[level];

  return (
    <div title={hint} className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span
          className={`text-theme-xs ${
            emphasized
              ? "font-semibold text-gray-800 dark:text-white/90"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {label}
        </span>
        <span className={`text-theme-xs font-semibold tabular-nums ${styles.text}`}>
          {pct == null ? "—" : `${pct}%`}
          <span className="ml-1 font-normal">{styles.label}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        aria-valuetext={pct == null ? "Not available" : `${pct}% (${styles.label})`}
        className={`w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/8 ${
          emphasized ? "h-2.5" : "h-1.5"
        }`}
      >
        <div
          className={`h-full rounded-full transition-all ${styles.bar}`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
}
