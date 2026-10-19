import type { Decision } from "../../types/extraction-types";

export interface ReceiverToken {
  text: string;
  bbox: { x: number; y: number; w: number; h: number };
  confidence: number;
}

export interface ReceiverChunk {
  chunkId: string;
  text: string;
  /** 0-100 integer */
  sourceConfidence: number;
  /** 1-based page and normalized 0-1 box (top-left origin). Used by the admin review page. */
  page?: number;
  bbox?: { x: number; y: number; w: number; h: number };
  tokens?: ReceiverToken[];
}

export interface ReceiverUploadRequest {
  file: File;
  chunks: ReceiverChunk[];
}

export interface ReceiverExtractedField {
  field: "subject" | "from" | "to" | "dateReceived" | "summary";
  value: string | null;
  chunkIds: string[];
  aiConfidence: number | null;
  sourceConfidence: number | null;
  effectiveConfidence: number | null;
}

export interface ReceiverUploadResponse {
  decision: Decision;
  fields: ReceiverExtractedField[];
}
