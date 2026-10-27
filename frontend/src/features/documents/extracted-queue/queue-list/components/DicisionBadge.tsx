import type { Decision } from "../../../extraction/types/extraction-types";
import StatusBadge, { DECISION_BADGE } from "../../../../../components/ui/badge/StatusBadge";

/** Labels for use in filter pills, menus, and chips — kept here so existing imports don't break. */
export const DECISION_LABELS: Record<Decision, string> = {
  ACCEPT: DECISION_BADGE.ACCEPT.label,
  REVIEW: DECISION_BADGE.REVIEW.label,
  INVALID: DECISION_BADGE.INVALID.label,
};

export default function DecisionBadge({ decision }: { decision: Decision }) {
  return <StatusBadge config={DECISION_BADGE[decision]} />;
}
