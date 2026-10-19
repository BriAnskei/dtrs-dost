import { ExtractedField } from "../../extraction/providers/llm-extractor.interface";
import { Decision } from "../extration-queue.constant";

export interface ChunkBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExtractedToken {
  text: string;
  bbox: ChunkBBox;
  confidence?: number;
}

export interface ExtractedChunk {
  chunkId: string;
  text: string;
  sourceConfidence: number;
  page: number;
  bbox: ChunkBBox;
  tokens?: ExtractedToken[];
}

export type ExtractedDocumentField = {
  field: ExtractedField["field"];
  value: string | null;
  chunkIds: string[];
  aiConfidence: number | null;
  sourceConfidence: number | null;
  effectiveConfidence: number | null;
};

export type ReceiveDocumentResponse = {
  decision: Decision;
  fields: ExtractedDocumentField[];
};
