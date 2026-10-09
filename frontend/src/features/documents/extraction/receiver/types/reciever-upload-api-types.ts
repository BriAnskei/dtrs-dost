import type { Decision } from "../../types/extraction-types";

export interface ReceiverChunk {
  chunkId: string;
  text: string;
  /** 0-100 integer */
  sourceConfidence: number;
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
