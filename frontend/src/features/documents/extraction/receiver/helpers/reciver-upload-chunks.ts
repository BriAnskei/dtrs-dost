import type { PdfExtractionResult } from "../../pdf";
import type { ReceiverChunk } from "../types/reciever-upload-api-types";

// Mirrors the backend DTO limits.
export const MAX_RECEIVER_CHUNKS = 2000;
const MAX_TEXT_LENGTH = 20_000;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function toReceiverChunks(result: PdfExtractionResult): ReceiverChunk[] {
  const chunks: ReceiverChunk[] = [];

  for (const page of result.pages) {
    for (const chunk of page.content) {
      if (!chunk.bbox) continue;
      if (!chunk.text.trim()) continue;

      const confidence = Number.isFinite(chunk.confidence) ? chunk.confidence : 0;

      chunks.push({
        chunkId: chunk.chunkId,
        text: chunk.text.slice(0, MAX_TEXT_LENGTH),
        sourceConfidence: Math.min(100, Math.max(0, Math.round(confidence * 100))),
        page: page.page,
        bbox: {
          x: clamp01(chunk.bbox.x),
          y: clamp01(chunk.bbox.y),
          w: clamp01(chunk.bbox.width),
          h: clamp01(chunk.bbox.height),
        },
        tokens: chunk.tokens?.map((t) => ({
          text: t.text,
          bbox: {
            x: clamp01(t.bbox.x),
            y: clamp01(t.bbox.y),
            w: clamp01(t.bbox.width),
            h: clamp01(t.bbox.height),
          },
          confidence: clamp01(t.confidence ?? 1.0),
        })),
      });
    }
  }

  return chunks;
}
