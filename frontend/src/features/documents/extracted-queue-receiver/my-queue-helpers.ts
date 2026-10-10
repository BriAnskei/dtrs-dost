import type { Decision } from "../extraction/types/extraction-types";
import type {
  ExtractedDocumentQueueStatus,
  MyExtractedDocumentQueue,
} from "./types/extracted-queue-receiver-types";

export const DECISION_OPTIONS: Decision[] = ["ACCEPT", "REVIEW", "INVALID"];

export const STATUS_OPTIONS: ExtractedDocumentQueueStatus[] = [
  "PENDING",
  "APPROVED",
  "INVALIDATED",
];

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

export function getStatusBadgeColor(status: ExtractedDocumentQueueStatus): BadgeColor {
  switch (status) {
    case "APPROVED":
      return "success";
    case "INVALIDATED":
      return "error";
    case "PENDING":
      return "warning";
  }
}

export function getDecisionBadgeColor(decision: Decision): BadgeColor {
  switch (decision) {
    case "ACCEPT":
      return "success";
    case "REVIEW":
      return "warning";
    case "INVALID":
      return "error";
  }
}

export function capitalize(value: string): string {
  const normalized = value.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/** A receiver may delete/remove only when rejected by the rules or by the admin. */
export function canDeleteQueueItem(item: MyExtractedDocumentQueue): boolean {
  return item.status === "INVALIDATED" || item.decision === "INVALID";
}
