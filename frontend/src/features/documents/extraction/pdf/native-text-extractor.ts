import type { PDFPageProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { mergeBoxes } from "./bbox";
import { createMeasureContext } from "./canvas";
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
 * -Aleready updated using the canvas measurement and slightly improve the configurraiton
 * awaiting for testing
 */
function splitIntoWords(
  item: TextItem,
  style: { fontFamily: string },
  ctx: CanvasRenderingContext2D,
): Word[] {
  const raw = item.str;
  const totalWidth = ctx.measureText(raw).width;

  const invalid = !raw.trim() || totalWidth <= 0;

  if (invalid) {
    return [];
  }

  const fontSize = Math.hypot(item.transform[0], item.transform[1]);
  ctx.font = `${fontSize}px ${style.fontFamily}`;

  const height =
    Math.abs(item.height) || Math.hypot(item.transform[2], item.transform[3]);

  return [...raw.matchAll(/\S+/g)].map((match) => {
    const text = match[0];
    const index = match.index ?? 0;

    const startWidth = ctx.measureText(raw.slice(0, index)).width;
    const endWidth = ctx.measureText(raw.slice(0, index + text.length)).width;

    return {
      text,
      x: item.transform[4] + (startWidth / totalWidth) * item.width,
      baseline: item.transform[5],
      width: ((endWidth - startWidth) / totalWidth) * item.width,
      height,
    };
  });
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

  const ctx = createMeasureContext();

  const words = content.items.filter(isTextItem).flatMap((item) => {
    const style = content.styles[item.fontName];

    return splitIntoWords(item, style, ctx);
  });

  const viewport = page.getViewport({ scale: 1 });

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
