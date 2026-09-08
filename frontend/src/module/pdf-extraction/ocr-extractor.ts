import type { PDFPageProxy } from "pdfjs-dist";
import type Tesseract from "tesseract.js";
import { PDF_EXTRACTION_CONFIG } from "./config";

export async function renderPageToCanvas(page: PDFPageProxy): Promise<HTMLCanvasElement> {
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
export async function performOCR(
  page: PDFPageProxy,
  pageNumber: number,
  worker: Tesseract.Worker,
) {
  const canvas = await renderPageToCanvas(page);

  const result = await worker.recognize(canvas);

  const text = result.data.text.trim();

  if (!text) {
    return [];
  }

  return [
    {
      chunkId: `p${pageNumber}-o1`,
      text,
      source: "ocr" as const,
      confidence: result.data.confidence / 100,
    },
  ];
}
