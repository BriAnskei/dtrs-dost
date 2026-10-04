import { ACCEPT_THRESHOLD } from "../constans";
import type { Decision, ResultRow } from "../types/extraction-types";

/** Effective = AI x Source (both 0-100). */
export const computeEffective = (ai: number, source: number) =>
  Math.round((ai * source) / 100);

export function decide(rows: ResultRow[]): {
  decision: Decision;
  minEffective: number | null;
} {
  // Any missing field -> INVALID
  if (rows.some((r) => r.value === null || r.effectiveConfidence === null)) {
    return { decision: "INVALID", minEffective: null };
  }
  const minEffective = Math.min(...rows.map((r) => r.effectiveConfidence!));
  return {
    decision: minEffective >= ACCEPT_THRESHOLD ? "ACCEPT" : "REVIEW",
    minEffective,
  };
}

export const confidenceTone = (v: number | null) =>
  v === null
    ? "text-gray-400 dark:text-gray-500"
    : v >= ACCEPT_THRESHOLD
      ? "text-success-600 dark:text-success-400"
      : "text-warning-600 dark:text-warning-400";

export const formatBytes = (b: number) =>
  b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

export const isFlagged = (r: ResultRow) =>
  r.effectiveConfidence === null || r.effectiveConfidence < ACCEPT_THRESHOLD;
