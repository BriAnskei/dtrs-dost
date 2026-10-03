import type { PDFPageProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { mergeBoxes } from "./bbox";
import { PDF_EXTRACTION_CONFIG } from "./config";
import type { BoundingBox, ExtractionChunk, ExtractionToken } from "./types";

/** One word in PDF points (origin bottom-left, y = baseline). */
interface Word {
  text: string;
  x: number;
  baseline: number;
  width: number;
  height: number;
}

const DESCENT = 0.2; // extend the box below the baseline for g/y/p

function isTextItem(item: unknown): item is TextItem {
  return (
    typeof item === "object" && item !== null && "str" in item && "transform" in item
  );
}

/**
 * pdf.js gives one item per text run (often a whole phrase). Split it into words,
 * sharing the run's width by character count. Slightly approximate for proportional
 * fonts; upgrade later with canvas measureText if boxes drift.
 */
function splitIntoWords(item: TextItem): Word[] {
  const raw = item.str;
  if (!raw.trim()) return [];
  const height =
    Math.abs(item.height) || Math.hypot(item.transform[2], item.transform[3]);
  return [...raw.matchAll(/\S+/g)].map((m) => ({
    text: m[0],
    x: item.transform[4] + ((m.index ?? 0) / raw.length) * item.width,
    baseline: item.transform[5],
    width: (m[0].length / raw.length) * item.width,
    height,
  }));
}

function groupIntoLines(words: Word[]): Word[][] {
  const lines: Word[][] = [];
  for (const w of words) {
    const line = lines.find(
      (l) =>
        Math.abs(l[0].baseline - w.baseline) <= Math.min(l[0].height, w.height) * 0.5,
    );
    if (line) line.push(w);
    else lines.push([w]);
  }
  for (const l of lines) l.sort((a, b) => a.x - b.x);
  // PDF y grows upward, so descending baseline = top of the page first.
  lines.sort((a, b) => b[0].baseline - a[0].baseline);
  return lines;
}

function toBox(w: Word, pageW: number, pageH: number): BoundingBox {
  const top = w.baseline + w.height;
  const bottom = w.baseline - w.height * DESCENT;
  return {
    x: w.x / pageW,
    y: 1 - top / pageH, // flip to top-left origin
    width: w.width / pageW,
    height: (top - bottom) / pageH,
  };
}

export async function extractNativeText(
  page: PDFPageProxy,
  pageNumber: number,
): Promise<ExtractionChunk[]> {
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const [originX, originY] = viewport.viewBox; // mediaBox may not start at 0,0

  const words = content.items
    .filter(isTextItem)
    .flatMap((item) => splitIntoWords(item))
    .map((w) => ({ ...w, x: w.x - originX, baseline: w.baseline - originY }));

  return groupIntoLines(words).map((line, i): ExtractionChunk => {
    const tokens: ExtractionToken[] = line.map((w) => ({
      text: w.text,
      bbox: toBox(w, viewport.width, viewport.height),
    }));
    return {
      chunkId: `p${pageNumber}-t${i + 1}`,
      text: tokens.map((t) => t.text).join(" "),
      source: "text",
      confidence: PDF_EXTRACTION_CONFIG.nativeTextConfidence,
      bbox: mergeBoxes(tokens.map((t) => t.bbox)),
      tokens,
    };
  });
}
