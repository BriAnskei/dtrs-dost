import Badge, { BadgeColor } from "./Badge";

export type { BadgeColor };

/**
 * Generic status-to-badge config. Each module builds a `Record<Status, StatusBadgeConfig>`
 * using the maps exported below, so every status badge in the app shares one
 * rendering shell (<StatusBadge>) with consistent sizing and color semantics.
 */
export interface StatusBadgeConfig {
  color: BadgeColor;
  label: string;
}

export interface StatusBadgeProps {
  /** Resolved config for this row's status. */
  config: StatusBadgeConfig;
  /** Badge size; defaults to "sm" to match the users module table convention. */
  size?: "sm" | "md";
}

/**
 * Reusable status badge. Given a { color, label } config, renders a <Badge>.
 * Every module uses this same component — only the config map differs.
 *
 * Usage:
 *   import StatusBadge, { INCOMING_STATUS_BADGE } from ".../badge/StatusBadge";
 *   <StatusBadge config={INCOMING_STATUS_BADGE[row.status]} />
 */
export default function StatusBadge({ config, size = "sm" }: StatusBadgeProps) {
  return (
    <Badge size={size} color={config.color}>
      {config.label}
    </Badge>
  );
}

/* ── Per-module status maps ────────────────────────────────────────── */

import type { AccountStatus, UserRole } from "../../../features/user-management/types/user.type";
import type { IncomingDocumentStatus } from "../../../features/documents/incomming/types/incoming-document.type";
import type { ExtractedDocumentQueueStatus } from "../../../features/documents/extracted-queue-receiver/types/extracted-queue-receiver-types";
import type { Decision } from "../../../features/documents/extraction/types/extraction-types";

export const ACCOUNT_STATUS_BADGE: Record<AccountStatus, StatusBadgeConfig> = {
  Active: { color: "success", label: "Active" },
  Disabled: { color: "error", label: "Disabled" },
};

/** Mirrors `getRoleBadgeColor` from user-management/helpers — centralized here so every table shares one role-to-color map. */
export const ROLE_BADGE: Record<UserRole, StatusBadgeConfig> = {
  "Super Admin": { color: "primary", label: "Super Admin" },
  Admin: { color: "warning", label: "Admin" },
  Division: { color: "success", label: "Division" },
  Receiver: { color: "info", label: "Receiver" },
};

export const INCOMING_STATUS_BADGE: Record<IncomingDocumentStatus, StatusBadgeConfig> = {
  pending: { color: "warning", label: "Pending" },
  ongoing: { color: "info", label: "Ongoing" },
  complete: { color: "success", label: "Complete" },
};

export const QUEUE_STATUS_BADGE: Record<ExtractedDocumentQueueStatus, StatusBadgeConfig> = {
  APPROVED: { color: "success", label: "Approved" },
  INVALIDATED: { color: "error", label: "Invalidated" },
  PENDING: { color: "warning", label: "Pending" },
};

export const DECISION_BADGE: Record<Decision, StatusBadgeConfig> = {
  ACCEPT: { color: "success", label: "Accepted" },
  REVIEW: { color: "warning", label: "For Review" },
  INVALID: { color: "error", label: "Invalid" },
};

/** Invalid documents tab: "on-review" vs "marked invalid". */
export const INVALID_DOC_STATUS_BADGE: Record<"invalid" | "on-review", StatusBadgeConfig> =
  {
    invalid: { color: "error", label: "Marked Invalid" },
    "on-review": { color: "warning", label: "On Review" },
  };

/** Uploaded incoming docs page: queue/upload statuses. */
export const UPLOAD_STATUS_BADGE: Record<
  "on-queue" | "received" | "archived" | "rejected",
  StatusBadgeConfig
> = {
  "on-queue": { color: "warning", label: "On-Queue" },
  received: { color: "success", label: "Received" },
  archived: { color: "dark", label: "Archived" },
  rejected: { color: "error", label: "Rejected" },
};
