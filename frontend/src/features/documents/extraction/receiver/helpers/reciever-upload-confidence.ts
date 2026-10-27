import { CONFIDENCE_THRESHOLDS } from "../receiver-upload-constants";

/** Accepts 0-1 or 0-100 and returns a 0-100 number, or null. */
export function toPercent(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const pct = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** True when a score is below the "needs a closer look" threshold. Missing scores are not flagged. */
export function isLowConfidence(pct: number | null): boolean {
  return pct != null && pct < CONFIDENCE_THRESHOLDS.medium;
}

export function formatPercent(pct: number | null): string {
  return pct == null ? "—" : `${pct}%`;
}
