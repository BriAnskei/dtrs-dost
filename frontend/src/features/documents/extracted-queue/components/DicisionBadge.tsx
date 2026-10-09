import type { Decision } from "../../extraction/types/extraction-types";

const DECISION_STYLES: Record<Decision, { label: string; className: string }> = {
  ACCEPT: {
    label: "Accepted",
    className: "text-success-600 dark:text-success-400",
  },
  REVIEW: {
    label: "For review",
    className: "text-warning-600 dark:text-warning-400",
  },
  INVALID: {
    label: "Invalid",
    className: "text-error-600 dark:text-error-400",
  },
};

export const DECISION_LABELS: Record<Decision, string> = {
  ACCEPT: DECISION_STYLES.ACCEPT.label,
  REVIEW: DECISION_STYLES.REVIEW.label,
  INVALID: DECISION_STYLES.INVALID.label,
};

export default function DecisionBadge({ decision }: { decision: Decision }) {
  const style = DECISION_STYLES[decision];

  return (
    <span className={`whitespace-nowrap text-theme-sm font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}
