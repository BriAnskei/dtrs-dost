import { apiClient } from "../../../../lib/api-client";
import type { DocumentDirection, FieldKey } from "../types/extraction-types";

export interface ExtractionRequest {
  /** Document flow type; selects which fields the LLM should look for. */
  documentType: DocumentDirection;

  chunks: Array<{ chunkId: string; text: string }>;
}

export interface FieldExtraction {
  field: FieldKey;
  value: string | null;
  chunkIds: string[];
  aiConfidence: number | null;
}

export interface ExtractionResponse {
  fields: FieldExtraction[];
}

export const extractionService = {
  async extractFields(request: ExtractionRequest): Promise<ExtractionResponse> {
    const response = await apiClient.post<ExtractionResponse>("/extraction", request);
    return response.data;
  },
};
