import { DocumentDirection } from "../contants/document-direction";
import { FieldKey } from "../contants/extraction-field";

export const LLM_EXTRACTOR = Symbol("LLM_EXTRACTOR");

export interface ExtractionChunk {
  chunkId: string;
  text: string;
}

export interface ExtractedField {
  field: FieldKey;
  value: string | null;
  chunkIds: string[];
  aiConfidence: number | null;
}

export interface LlmExtractor {
  extractFields(
    documentType: DocumentDirection,
    chunks: ExtractionChunk[],
  ): Promise<ExtractedField[]>;
}
