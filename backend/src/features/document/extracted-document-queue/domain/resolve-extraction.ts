import { ExtractedField } from "../../extraction/providers/llm-extractor.interface";
import { ACCEPT_CONFIDENCE_THRESHOLD } from "../extration-queue.constant";
import {
  ExtractedChunk,
  ExtractedDocumentField,
  ReceiveDocumentResponse,
} from "../types/extracted-types";

export function resolveExtraction(
  fields: ExtractedField[],
  chunks: ExtractedChunk[],
): ReceiveDocumentResponse {
  const chunkSourceConfidence = new Map(
    chunks.map((chunk) => [chunk.chunkId, chunk.sourceConfidence]),
  );

  const resolvedFields: ExtractedDocumentField[] = fields.map((field) => {
    if (field.value === null || field.aiConfidence === null) {
      return {
        field: field.field,
        value: field.value,
        chunkIds: field.chunkIds,
        aiConfidence: field.aiConfidence,
        sourceConfidence: null,
        effectiveConfidence: null,
      };
    }

    const sourceConfidences = field.chunkIds
      .map((chunkId) => chunkSourceConfidence.get(chunkId))
      .filter((confidence): confidence is number => confidence != null);

    if (sourceConfidences.length === 0) {
      return {
        field: field.field,
        value: field.value,
        chunkIds: field.chunkIds,
        aiConfidence: field.aiConfidence,
        sourceConfidence: null,
        effectiveConfidence: null,
      };
    }

    const sourceConfidence = Math.min(...sourceConfidences);

    const effectiveConfidence = Math.round((field.aiConfidence * sourceConfidence) / 100);

    return {
      field: field.field,
      value: field.value,
      chunkIds: field.chunkIds,
      aiConfidence: field.aiConfidence,
      sourceConfidence,
      effectiveConfidence,
    };
  });

  if (
    resolvedFields.some(
      (field) =>
        field.value === null ||
        field.aiConfidence === null ||
        field.effectiveConfidence === null,
    )
  ) {
    return {
      decision: "INVALID",
      fields: resolvedFields,
    };
  }

  const minEffectiveConfidence = Math.min(
    ...resolvedFields.map((field) => field.effectiveConfidence ?? 0),
  );

  return {
    decision: minEffectiveConfidence >= ACCEPT_CONFIDENCE_THRESHOLD ? "ACCEPT" : "REVIEW",
    fields: resolvedFields,
  };
}
