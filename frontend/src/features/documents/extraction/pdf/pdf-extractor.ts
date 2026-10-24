import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import { PDF_EXTRACTION_CONFIG } from "./config";
import { deduplicateMixedPage } from "./mixed-page-deduper";
import { extractNativeText } from "./native-text-extractor";
import { performOCR } from "./ocr-extractor";
import { getOcrWorker, terminateOcrWorker } from "./ocr-worker";
import { analyzePage } from "./page-analyzer";
import type { ExtractionChunk, PageExtractionResult, PdfExtractionResult } from "./types";

function getPageMode(
  hasNativeText: boolean,
  nativeTextLength: number,
  hasOcrChunks: boolean,
): PageExtractionResult["extractionMode"] {
  if (!hasNativeText && !hasOcrChunks) {
    return "empty";
  }

  if (nativeTextLength < PDF_EXTRACTION_CONFIG.minNativeTextLength && hasOcrChunks) {
    return "ocr";
  }

  if (hasNativeText && hasOcrChunks) {
    return "mixed";
  }

  if (hasNativeText) {
    return "text";
  }

  return "ocr";
}

export interface ExtractionProgress {
  /** Fires for every chunk as it is extracted (text only, no coordinates). */
  onChunk?: (chunk: ExtractionChunk) => void;
  /** Fires once per page after all its chunks are collected. */
  onPage?: (page: number, chunkCount: number) => void;
}

async function processPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  worker: Awaited<ReturnType<typeof getOcrWorker>>,
  progress?: ExtractionProgress,
): Promise<PageExtractionResult> {
  const page = await pdf.getPage(pageNumber);

  const analysis = await analyzePage(page);

  const nativeChunks = await extractNativeText(page, pageNumber);

  const nativeTextLength = nativeChunks.reduce(
    (total, chunk) => total + chunk.text.length,
    0,
  );

  let ocrChunks: ExtractionChunk[] = [];

  const needsOcr =
    nativeTextLength < PDF_EXTRACTION_CONFIG.minNativeTextLength || analysis.hasImages;

  if (needsOcr) {
    ocrChunks = await performOCR(page, pageNumber, worker);
  }

  const allChunks = [...nativeChunks, ...ocrChunks];

  const content =
    analysis.hasImages && nativeChunks.length > 0
      ? deduplicateMixedPage(allChunks)
      : allChunks;

  for (const chunk of content) progress?.onChunk?.(chunk);

  progress?.onPage?.(pageNumber, content.length);

  const extractionMode = getPageMode(
    nativeChunks.length > 0,
    nativeTextLength,
    ocrChunks.length > 0,
  );

  return {
    page: pageNumber,
    content,
    hasNativeText: nativeChunks.length > 0,
    hasImages: analysis.hasImages,
    extractionMode,
  };
}

export async function extractPdf(
  file: File,
  progress?: ExtractionProgress,
): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = getDocument({
    data: arrayBuffer,
  });

  const pdf = await loadingTask.promise;

  const worker = await getOcrWorker();

  const pages: PageExtractionResult[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await processPage(pdf, pageNumber, worker, progress);

      pages.push(page);
    }
  } finally {
    await terminateOcrWorker();
  }

  return {
    pages,
    totalPages: pdf.numPages,

    statistics: {
      textPages: pages.filter((page) => page.extractionMode === "text").length,

      ocrPages: pages.filter((page) => page.extractionMode === "ocr").length,

      mixedPages: pages.filter((page) => page.extractionMode === "mixed").length,

      emptyPages: pages.filter((page) => page.extractionMode === "empty").length,
    },
  };
}
