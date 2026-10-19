import type {
  ChunkLocation,
  Decision,
  FieldKey,
} from "../../extraction/types/extraction-types";

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

export interface ExtractedDetailField {
  field: FieldKey;
  value: string | null;
  chunkIds: string[];
  aiConfidence: number | null;
  sourceConfidence: number | null;
  effectiveConfidence: number | null;
}

export interface ExtractedDocumentQueueDetail {
  id: string;
  file_name: string;
  uploader_name: string | null;
  decision: Decision;
  status: "PENDING" | "APPROVED" | "INVALIDATED";
  created_at: string;
  fields: ExtractedDetailField[];
  /** chunkId -> location. Empty for rows uploaded before geometry was stored. */
  chunk_locations: Record<string, ChunkLocation>;
}
