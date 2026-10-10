import type { ReceiverExtractedField } from "../../extraction/receiver/types/reciever-upload-api-types";
import type { Decision } from "../../extraction/types/extraction-types";

export type ExtractedDocumentQueueStatus = "PENDING" | "APPROVED" | "INVALIDATED";

export type ExtractedDocumentQueueSort = "newest" | "oldest";

export interface FindMyExtractedDocumentQueuesParams {
  file_name?: string;
  decision?: Decision;
  status?: ExtractedDocumentQueueStatus;
  sort?: ExtractedDocumentQueueSort;
  limit?: number;
  cursor?: string;
}

export interface MyExtractedDocumentQueue {
  id: string;
  file_name: string;
  decision: Decision;
  status: ExtractedDocumentQueueStatus;
  fields: ReceiverExtractedField[];
  created_at: string;
}
