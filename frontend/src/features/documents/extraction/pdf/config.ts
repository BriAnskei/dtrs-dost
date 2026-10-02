export const PDF_EXTRACTION_CONFIG = {
  /**
   * Minimum amount of meaningful native text
   * before considering a page a text page.
   */
  minNativeTextLength: 10,

  /**
   * OCR rendering scale.
   *
   * Higher = better OCR but more CPU/memory.
   */
  ocrScale: 2,

  /**
   * Tesseract language.
   *
   * "eng" is appropriate for most English documents.
   */
  ocrLanguage: "eng",

  /**
   * Native PDF text receives maximum source confidence.
   */
  nativeTextConfidence: 1.0,

  /**
   * Ignore extremely small text fragments.
   */
  minTextFragmentLength: 1,

  /**
   * Tesseract confidence threshold.
   *
   * Tesseract returns confidence from 0-100.
   */
  minOcrConfidence: 0,

  /**
   * If native text occupies very little of the page
   * and the page contains images, OCR is useful.
   */
  mixedPageNativeTextRatio: 0.05,
} as const;
