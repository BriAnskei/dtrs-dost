export type ExtractionSource = "text" | "ocr";

/**
 * Bounding box of a chunk, normalized to 0-1 of the page with a top-left origin.
 *
 * This matches what the highlight overlay (PdfPageWithHighlights) consumes:
 * `left/top/width/height` are emitted as CSS percentages of the page box.
 * Native text is converted from pdfjs PDF points (bottom-left origin) via
 * `x/pageW`, `1 - (y + h) / pageH`, `w/pageW`, `h/pageH`; OCR bboxes come from
 * Tesseract in canvas pixels (already top-left) and are divided by canvas size.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractionChunk {
  chunkId: string;
  text: string;
  source: ExtractionSource;

  /**
   * 0.0 - 1.0
   *
   * For native PDF text this represents extraction/source
   * reliability, not semantic correctness.
   */
  confidence: number;

  bbox?: BoundingBox;
}

export interface PageExtractionResult {
  page: number;

  content: ExtractionChunk[];

  hasNativeText: boolean;
  hasImages: boolean;

  extractionMode: "text" | "ocr" | "mixed" | "empty";
}

export interface PdfExtractionResult {
  pages: PageExtractionResult[];

  totalPages: number;

  statistics: {
    textPages: number;
    ocrPages: number;
    mixedPages: number;
    emptyPages: number;
  };
}
