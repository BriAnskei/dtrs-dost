export const DECISION_VALUES = ["ACCEPT", "REVIEW", "INVALID"] as const;
export type Decision = (typeof DECISION_VALUES)[number];

export const EXTRACTED_DOCUMENT_QUEUE_SORT_VALUES = ["newest", "oldest"] as const;

export type ExtractedDocumentQueueSort =
  (typeof EXTRACTED_DOCUMENT_QUEUE_SORT_VALUES)[number];
