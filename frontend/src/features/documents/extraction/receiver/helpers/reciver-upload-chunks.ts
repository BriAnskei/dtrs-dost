import type { PdfExtractionResult } from "../../pdf";
import type { ReceiverChunk } from "../types/reciever-upload-api-types";

// Mirrors the backend DTO limits.
export const MAX_RECEIVER_CHUNKS = 500;
const MAX_TEXT_LENGTH = 20_000;

export function toReceiverChunks(result: PdfExtractionResult): ReceiverChunk[] {
  const chunks: ReceiverChunk[] = [];

  for (const page of result.pages) {
    for (const chunk of page.content) {
      // Same rule as before: no geometry means it can't be highlighted.
      if (!chunk.bbox) continue;
      // @IsNotEmpty on `text` would reject the whole request.
      if (!chunk.text.trim()) continue;

      chunks.push({
        chunkId: chunk.chunkId,
        text: chunk.text.slice(0, MAX_TEXT_LENGTH),
        sourceConfidence: Math.min(100, Math.max(0, Math.round(chunk.confidence * 100))),
      });
    }
  }

  return chunks;
}
