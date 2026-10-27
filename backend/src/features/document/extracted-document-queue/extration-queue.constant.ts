export const DECISION_VALUES = ["ACCEPT", "REVIEW", "INVALID"] as const;
export type Decision = (typeof DECISION_VALUES)[number];

export const EXTRACTED_DOCUMENT_QUEUE_SORT_VALUES = ["newest", "oldest"] as const;

export type ExtractedDocumentQueueSort =
  (typeof EXTRACTED_DOCUMENT_QUEUE_SORT_VALUES)[number];

/**
 * Minimum per-field `aiConfidence` (0-100 scale) required for an accepted
 * auto-extracted document. Documents whose best field falls below this are
 * routed to human review; any missing field is flagged INVALID.
 */
export const ACCEPT_CONFIDENCE_THRESHOLD = 90;
