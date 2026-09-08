export type ExtractionSource = "text" | "ocr";

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
