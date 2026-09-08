import type { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";
import { PDF_EXTRACTION_CONFIG } from "./config";
import type { BoundingBox, ExtractionChunk } from "./types";

function isTextItem(item: TextItem | unknown): item is TextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof (item as TextItem).str === "string"
  );
}

export function extractNativeText(
  textContent: TextContent,
  pageNumber: number,
): ExtractionChunk[] {
  const chunks: ExtractionChunk[] = [];

  let chunkIndex = 1;

  for (const item of textContent.items) {
    if (!isTextItem(item)) {
      continue;
    }

    const text = item.str.trim();

    if (text.length < PDF_EXTRACTION_CONFIG.minTextFragmentLength) {
      continue;
    }

    const transform = item.transform;

    const bbox: BoundingBox = {
      x: transform[4],
      y: transform[5],
      width: item.width,
      height: item.height,
    };

    chunks.push({
      chunkId: `p${pageNumber}-t${chunkIndex}`,
      text,
      source: "text",
      confidence: PDF_EXTRACTION_CONFIG.nativeTextConfidence,
      bbox,
    });

    chunkIndex++;
  }

  return chunks;
}
