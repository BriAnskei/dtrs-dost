import type { Decision } from "../../extraction/types/extraction-types";

export type ExtractedDocumentQueueSort = "newest" | "oldest";

export type ExtractedDocumentQueueStatus = "pending" | "approved" | "invalidated";

export interface FindMyExtractedDocumentQueuesParams {
  file_name?: string;
  decision?: Decision;
  status?: ExtractedDocumentQueueStatus;
  sort?: ExtractedDocumentQueueSort;
  limit?: number;
  cursor?: string;
}
