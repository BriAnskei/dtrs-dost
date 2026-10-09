import type { Decision } from "../../extraction/types/extraction-types";

export interface ExtractedDocumentQueue {
  id: string;
  document_file_id: string;
  file_name: string;
  object_key: string;
  uploader_id: string | null;
  uploader_name: string | null;
  decision: Decision;
  created_at: string;
}

export interface FindExtractedDocumentQueuesParams {
  limit?: number;
  cursor?: string;
  uploader_name?: string;
  unknown_uploader?: boolean;
  decision?: Decision;
  sort?: ExtractedDocumentQueueSort;
}

export type ExtractedDocumentQueueSort = "newest" | "oldest";
