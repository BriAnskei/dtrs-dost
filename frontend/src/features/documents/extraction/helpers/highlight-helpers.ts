import { CHUNK_LEVEL_FIELDS } from "../constans";
import type { ExtractionChunk } from "../pdf";
import { findValueBox } from "../pdf/text-matching";
import type {
  BBox,
  ChunkLocation,
  FieldHighlight,
  FieldKey,
} from "../types/extraction-types";

export const toBBox = (b: {
  x: number;
  y: number;
  width: number;
  height: number;
}): BBox => ({ x: b.x, y: b.y, w: b.width, h: b.height });

/** value + chunkIds from the LLM -> one box per chunk (exact words, else whole line). */
export function resolveHighlights(
  field: FieldKey,
  value: string,
  chunkIds: string[],
  chunksById: Map<string, ExtractionChunk>,
  locations: Record<string, ChunkLocation>,
): FieldHighlight[] {
  const narrow = !CHUNK_LEVEL_FIELDS.has(field);
  return chunkIds.flatMap((id) => {
    const loc = locations[id];
    if (!loc) return [];
    const tokens = chunksById.get(id)?.tokens;
    const exact = narrow && tokens ? findValueBox(value, tokens) : null;
    return [{ page: loc.page, bbox: exact ? toBBox(exact) : loc.bbox }];
  });
}
