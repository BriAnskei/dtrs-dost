import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { createWorker } from "tesseract.js";
import { PDF_EXTRACTION_CONFIG } from "./config";
import { performOCR } from "./ocr-extractor";
import { analyzePage } from "./page-analyzer";
import { extractNativeText } from "./text-extractor";
import type { PageExtractionResult, PdfExtractionResult } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractPdf(file: File): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  const pages: PageExtractionResult[] = [];

  const worker = await createWorker(PDF_EXTRACTION_CONFIG.ocrLanguage);
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);

      const textContent = await page.getTextContent();

      const nativeChunks = extractNativeText(textContent, pageNumber);

      const nativeTextLength = nativeChunks.reduce(
        (total, chunk) => total + chunk.text.length,
        0,
      );

      const analysis = await analyzePage(page, nativeTextLength);

      let content = [];

      let extractionMode: PageExtractionResult["extractionMode"];

      /*
       * CASE 1
       *
       * No native text.
       *
       * This is most likely a scanned page.
       */
      if (nativeTextLength < PDF_EXTRACTION_CONFIG.minNativeTextLength) {
        const ocrChunks = await performOCR(page, pageNumber, worker);

        content = ocrChunks;

        extractionMode = ocrChunks.length > 0 ? "ocr" : "empty";
      } else if (!analysis.hasImages) {
        /*
         * CASE 2
         *
         * Native text exists and there
         * are no images.
         */
        content = nativeChunks;

        extractionMode = "text";
      } else {
        /*
         * CASE 3
         *
         * Native text + images.
         *
         * Potential mixed page.
         */
        const ocrChunks = await performOCR(page, pageNumber, worker);

        content = [...nativeChunks, ...ocrChunks];

        extractionMode = "mixed";
      }

      pages.push({
        page: pageNumber,
        content,
        hasNativeText: nativeChunks.length > 0,
        hasImages: analysis.hasImages,
        extractionMode,
      });
    }
  } finally {
    await worker.terminate();
  }

  return {
    pages,

    totalPages: pdf.numPages,

    statistics: {
      textPages: pages.filter((p) => p.extractionMode === "text").length,

      ocrPages: pages.filter((p) => p.extractionMode === "ocr").length,

      mixedPages: pages.filter((p) => p.extractionMode === "mixed").length,

      emptyPages: pages.filter((p) => p.extractionMode === "empty").length,
    },
  };
}
