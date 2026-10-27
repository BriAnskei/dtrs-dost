import { FIELDS_BY_DIRECTION } from "../../extraction/constans";
import { decide } from "../../extraction/helpers/extraction-helpers";
import { resolveHighlights } from "../../extraction/helpers/highlight-helpers";
import type { ExtractionChunk, ExtractionToken } from "../../extraction/pdf/types";
import type {
  ExtractionOutcome,
  ResultRow,
} from "../../extraction/types/extraction-types";
import type { ExtractedDocumentQueueDetail } from "../types/extracted-document-queue.types";

/** Build a chunksById map from stored chunk_locations so resolveHighlights can use word tokens. */
function buildChunksById(
  locations: ExtractedDocumentQueueDetail["chunk_locations"],
): Map<string, ExtractionChunk> {
  const map = new Map<string, ExtractionChunk>();
  for (const [id, loc] of Object.entries(locations)) {
    const tokens: ExtractionToken[] | undefined = loc.tokens?.map((t) => ({
      text: t.text,
      bbox: {
        x: t.bbox.x,
        y: t.bbox.y,
        width: t.bbox.w,
        height: t.bbox.h,
      },
      confidence: t.confidence ?? 1.0,
    }));
    map.set(id, {
      chunkId: id,
      text: loc.text,

      // we do fixed text, source is not important in the review handler admins only
      // needs to see the extracted text and EF confidence
      source: "text",
      confidence: loc.sourceConfidence != null ? loc.sourceConfidence / 100 : 1.0,
      tokens,
    });
  }
  return map;
}

/** Rebuilds the shape live extraction produces, so ReviewSplitView works unchanged. */
export function toOutcome(detail: ExtractedDocumentQueueDetail): ExtractionOutcome {
  const chunksById = buildChunksById(detail.chunk_locations);

  // Only incoming documents go through the queue.
  const rows: ResultRow[] = FIELDS_BY_DIRECTION.incoming.map((field) => {
    const hit = detail.fields.find((f) => f.field === field);

    if (!hit) {
      return {
        field,
        value: null,
        page: null,
        chunkIds: [],
        highlights: [],
        aiConfidence: null,
        sourceConfidence: null,
        effectiveConfidence: null,
      };
    }

    const chunkIds = hit.chunkIds.filter((id) => id in detail.chunk_locations);

    const highlights =
      hit.value === null
        ? []
        : resolveHighlights(
            field,
            hit.value,
            chunkIds,
            chunksById,
            detail.chunk_locations,
          );

    return {
      field,
      value: hit.value,
      page: highlights[0]?.page ?? null,
      chunkIds,
      highlights,
      aiConfidence: hit.aiConfidence,
      sourceConfidence: hit.sourceConfidence,
      effectiveConfidence: hit.effectiveConfidence,
    };
  });

  return {
    chunkLocations: detail.chunk_locations,
    rows,
    decision: detail.decision, // the stored verdict
    minEffective: decide(rows).minEffective,
  };
}
