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

export function capitalize(value: string): string {
  const normalized = value.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

