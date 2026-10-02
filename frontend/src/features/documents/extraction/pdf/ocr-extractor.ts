import type { PDFPageProxy } from "pdfjs-dist";
import type Tesseract from "tesseract.js";
import { PDF_EXTRACTION_CONFIG } from "./config";
import type { BoundingBox, ExtractionChunk } from "./types";

export async function renderPageToCanvas(
  page: PDFPageProxy,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({
    scale: PDF_EXTRACTION_CONFIG.ocrScale,
  });

  const canvas = document.createElement("canvas");

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create 2D canvas context.");
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

/**
 * OCR a page and emit LINE-level chunks with normalized 0-1 top-left bboxes.
 *
 * Tesseract line bboxes are in canvas pixels with a top-left origin (same
 * orientation as the page overlay), so normalization is a plain divide by the
 * canvas dimensions — no Y flip needed. If the structured `blocks` data is
 * unavailable we fall back to a single full-page chunk so the text is still
 * searchable by the LLM (it just won't highlight to a precise rectangle).
 */
export async function performOCR(
  page: PDFPageProxy,
  pageNumber: number,
  worker: Tesseract.Worker,
): Promise<ExtractionChunk[]> {
  const canvas = await renderPageToCanvas(page);

  const result = await worker.recognize(canvas);

  const text = (result.data?.text ?? "").trim();

  if (!text) {
    return [];
  }

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // blocks -> paragraphs -> lines, each Line exposes { text, bbox:{x0,y0,x1,y1} }.
  const lines = (result.data?.blocks ?? [])
    .flatMap((block) => block.paragraphs)
    .flatMap((paragraph) => paragraph.lines)
    .filter((line) => typeof line.text === "string" && line.bbox != null);

  const chunks: ExtractionChunk[] = [];
  let chunkIndex = 1;

  for (const line of lines) {
    const value = line.text.trim();
    if (!value) {
      continue;
    }

    const b = line.bbox;
    const bbox: BoundingBox = {
      x: canvasWidth > 0 ? b.x0 / canvasWidth : 0,
      y: canvasHeight > 0 ? b.y0 / canvasHeight : 0,
      width: canvasWidth > 0 ? (b.x1 - b.x0) / canvasWidth : 0,
      height: canvasHeight > 0 ? (b.y1 - b.y0) / canvasHeight : 0,
    };

    chunks.push({
      chunkId: `p${pageNumber}-o${chunkIndex}`,
      text: value,
      source: "ocr",
      confidence: (result.data?.confidence ?? 0) / 100,
      bbox,
    });

    chunkIndex++;
  }

  if (chunks.length === 0) {
    // Structured data was unavailable — keep the page text as one chunk so the
    // LLM can still read it, with a full-page bbox as a best-effort fallback.
    chunks.push({
      chunkId: `p${pageNumber}-o1`,
      text,
      source: "ocr",
      confidence: (result.data?.confidence ?? 0) / 100,
      bbox: { x: 0, y: 0, width: 1, height: 1 },
    });
  }

  return chunks;
}
