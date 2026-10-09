import type { PDFPageProxy } from "pdfjs-dist";
import type { Worker } from "tesseract.js";
import { mergeBoxes } from "./bbox";
import { PDF_EXTRACTION_CONFIG } from "./config";
import type { BoundingBox, ExtractionChunk, ExtractionToken } from "./types";

async function renderPageToCanvas(page: PDFPageProxy): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({
    scale: PDF_EXTRACTION_CONFIG.ocrScale,
  });

  const canvas = document.createElement("canvas");

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create canvas context");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}

function normalizeBoundingBox(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  canvasWidth: number,
  canvasHeight: number,
): BoundingBox {
  return {
    x: x0 / canvasWidth,
    y: y0 / canvasHeight,
    width: (x1 - x0) / canvasWidth,
    height: (y1 - y0) / canvasHeight,
  };
}

export async function performOCR(
  page: PDFPageProxy,
  pageNumber: number,
  worker: Worker,
): Promise<ExtractionChunk[]> {
  const canvas = await renderPageToCanvas(page);

  const result = await worker.recognize(canvas, {}, { blocks: true });

  // Collect raw OCR lines first, then sort by spatial position (top-to-bottom,
  // left-to-right) before assigning chunkIds. Tesseract can return blocks in
  // different order across runs; sorting by bbox ensures stable chunkIds and
  // stable prompt ordering regardless of internal iteration order.
  const rawLines: ExtractionChunk[] = [];

  for (const block of result.data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const tokens: ExtractionToken[] = [];

        for (const word of line.words ?? []) {
          const text = word.text.trim();

          if (!text) {
            continue;
          }

          const confidence = word.confidence / 100;

          if (confidence < PDF_EXTRACTION_CONFIG.minOcrConfidence) {
            continue;
          }

          tokens.push({
            text,
            bbox: normalizeBoundingBox(
              word.bbox.x0,
              word.bbox.y0,
              word.bbox.x1,
              word.bbox.y1,
              canvas.width,
              canvas.height,
            ),
            confidence,
          });
        }

        if (tokens.length === 0) {
          continue;
        }

        const bbox = mergeBoxes(tokens.map((token) => token.bbox));

        rawLines.push({
          chunkId: "", // assigned after sorting
          text: tokens.map((token) => token.text).join(" "),
          source: "ocr",
          confidence:
            tokens.reduce((sum, token) => sum + (token.confidence ?? 0), 0) /
            tokens.length,
          bbox,
          tokens,
        });
      }
    }
  }

  // Sort OCR lines by spatial position: top-to-bottom (y), then left-to-right (x).
  // This matches how the LLM and reviewer read, and ensures chunkIds are stable
  // across Tesseract runs that may iterate blocks in different order.
  rawLines.sort(
    (a, b) =>
      (a.bbox?.y ?? 0) - (b.bbox?.y ?? 0) ||
      (a.bbox?.x ?? 0) - (b.bbox?.x ?? 0),
  );

  return rawLines.map((chunk, i) => ({
    ...chunk,
    chunkId: `p${pageNumber}-o${i + 1}`,
  }));
}
