import { ExtractedField } from "../../extraction/providers/llm-extractor.interface";
import { Decision } from "../extration-queue.constant";

export interface ExtractedChunk {
  chunkId: string;
  text: string;
  sourceConfidence: number;
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
