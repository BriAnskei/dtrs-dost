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

type RawFragment = {
  text: string;
  x: number; // PDF points, bottom-left origin
  y: number; // baseline Y in PDF points
  width: number;
  height: number;
};

/**
 * Extract native PDF text and group it into LINE-level chunks.
 *
 * pdf.js emits one TextItem per positioned run; items that share a baseline
 * (transform[5]) belong to the same line. We union their boxes into one chunk
 * per line so the LLM can reference a whole line (e.g. "Subject: Q4 Report")
 * with a single chunkId rather than a single word.
 *
 * Bboxes are normalized to 0-1 of the page with a top-left origin:
 *   x = left / pageW
 *   y = 1 - top / pageH        (flip: PDF origin is bottom-left, screen top-left)
 *   w = (right - left) / pageW
 *   h = (top - baseline) / pageH
 * where top = max(baseline + height) across items in the line, and baseline
 * = min y (the lowest baseline, which for a single-baseline line is that y).
 */
export function extractNativeText(
  textContent: TextContent,
  pageNumber: number,
  pageWidth: number,
  pageHeight: number,
): ExtractionChunk[] {
  const fragments: RawFragment[] = [];

  for (const item of textContent.items) {
    if (!isTextItem(item)) {
      continue;
    }

    const text = item.str.trim();

    if (text.length < PDF_EXTRACTION_CONFIG.minTextFragmentLength) {
      continue;
    }

    const transform = item.transform;

    fragments.push({
      text,
      x: transform[4],
      y: transform[5],
      width: item.width,
      height: item.height,
    });
  }

  // Group fragments into lines by shared baseline (tolerance ~1 PDF point so
  // sub-pixel rounding from pdf.js does not split a real line).
  const lines: RawFragment[][] = [];
  for (const fragment of fragments) {
    const line = lines.find((l) => Math.abs(l[0].y - fragment.y) <= 1);
    if (line) {
      line.push(fragment);
    } else {
      lines.push([fragment]);
    }
  }

  const chunks: ExtractionChunk[] = [];
  let chunkIndex = 1;

  for (const line of lines) {
    const left = Math.min(...line.map((f) => f.x));
    const baseline = Math.min(...line.map((f) => f.y));
    const right = Math.max(...line.map((f) => f.x + f.width));
    const top = Math.max(...line.map((f) => f.y + f.height));

    const text = line.map((f) => f.text).join(" ");

    const bbox: BoundingBox = {
      x: pageWidth > 0 ? left / pageWidth : 0,
      y: pageHeight > 0 ? 1 - top / pageHeight : 0,
      width: pageWidth > 0 ? (right - left) / pageWidth : 0,
      height: pageHeight > 0 ? (top - baseline) / pageHeight : 0,
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
