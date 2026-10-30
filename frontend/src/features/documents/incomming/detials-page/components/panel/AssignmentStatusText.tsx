import type { BadgeColor } from "../../../../../../components/ui/badge/Badge";
import { ASSIGNMENT_STATUS_BADGE } from "../../../../../../components/ui/badge/StatusBadge";
import type { Status } from "../../../types/routed-division-assignments.type";

/**
 * Font-color-only version of the shared status badge: same label and color
 * semantics from ASSIGNMENT_STATUS_BADGE, but no background or border.
 * Adjust the classes if your theme uses different tokens.
 */
const TEXT_COLOR: Partial<Record<BadgeColor, string>> = {
  success: "text-success-700 dark:text-success-400",
  warning: "text-warning-700 dark:text-warning-400",
  error: "text-error-600 dark:text-error-400",
  info: "text-blue-light-600 dark:text-blue-light-400",
  primary: "text-primary dark:text-secondary",
  dark: "text-gray-700 dark:text-gray-300",
};

const FALLBACK_TEXT_COLOR = "text-gray-500 dark:text-gray-400";

export default function AssignmentStatusText({ status }: { status: Status }) {
  const { color, label } = ASSIGNMENT_STATUS_BADGE[status];

  return (
    <span
      className={`whitespace-nowrap text-theme-xs font-medium ${
        TEXT_COLOR[color] ?? FALLBACK_TEXT_COLOR
      }`}
    >
      {label}
    </span>
  );
}
