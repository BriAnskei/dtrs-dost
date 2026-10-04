/**
 * Unit tests for `deduplicateMixedPage` (mixed-page-deduper.ts).
 *
 * THE FUNCTION UNDER TEST:
 *
 *   deduplicateMixedPage(chunks: ExtractionChunk[]): ExtractionChunk[]
 *
 * On a "mixed" page the frontend runs BOTH native PDF text extraction and OCR,
 * producing two sets of chunks. This function de-duplicates them:
 *
 *   1. All native ("text") chunks are kept as-is.
 *   2. An OCR ("ocr") chunk is dropped if it duplicates a native chunk:
 *      a. Exact (normalized) text match, OR
 *      b. Bounding-box overlap (IoU) >= 0.5.
 *   3. The remaining chunks are sorted back into reading order: by bbox.y
 *      (top-to-bottom), then by bbox.x (left-to-right).
 *
 * The function is pure — it takes an in-memory chunk array and returns a new
 * array, so it's fully unit-testable without pdfjs or tesseract.
 */

import { describe, expect, it } from "vitest";
import type { BoundingBox, ExtractionChunk } from "../pdf/types";
import { deduplicateMixedPage } from "../pdf/mixed-page-deduper";

function textChunk(id: string, text: string, x: number, y: number, w = 100, h = 10): ExtractionChunk {
  return {
    chunkId: id,
    text,
    source: "text",
    confidence: 1.0,
    bbox: { x, y, width: w, height: h },
  };
}

function ocrChunk(id: string, text: string, x: number, y: number, w = 100, h = 10): ExtractionChunk {
  return {
    chunkId: id,
    text,
    source: "ocr",
    confidence: 0.9,
    bbox: { x, y, width: w, height: h },
  };
}

describe("deduplicateMixedPage", () => {
  /* ── Deduplication: exact text match ─────────────────────────────── */

  describe("exact text match deduplication", () => {
    it("drops an OCR chunk whose normalized text matches a native chunk", () => {
      const native = textChunk("p1-t1", "Republic of the Philippines", 0, 0);
      const ocr = ocrChunk("p1-o1", "Republic of the Philippines", 0, 0);

      const result = deduplicateMixedPage([ocr, native]);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("text");
      expect(result[0].chunkId).toBe("p1-t1");
    });

    it("text match is case-insensitive and punctuation-normalized", () => {
      const native = textChunk("p1-t1", "Republic of the Philippines", 0, 0);
      const ocr = ocrChunk("p1-o1", "republic of the phillippines", 0, 0);

      const result = deduplicateMixedPage([native, ocr]);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("text");
    });
  });

  /* ── Deduplication: IoU overlap ─────────────────────────────────── */

  describe("IoU overlap deduplication", () => {
    it("drops an OCR chunk that overlaps a native chunk by >= 50 %", () => {
      // Native: x:[0,100], y:[0,10]  area = 1000
      // OCR:    x:[0,100], y:[0,10]  area = 1000  → IoU = 1.0
      const native = textChunk("p1-t1", "Native text", 0, 0, 100, 10);
      const ocr = ocrChunk("p1-o1", "OCR text", 0, 0, 100, 10);

      const result = deduplicateMixedPage([native, ocr]);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("text");
    });

    it("keeps an OCR chunk whose bbox barely overlaps a native chunk (< 50 % IoU)", () => {
      // Native: x:[0, 100], y:[0, 10]  area = 1000
      // OCR:    x:[95, 195], y:[0, 10]  area = 1000
      // Intersection: x:[95,100] → 5 * 10 = 50; union = 1000 + 1000 - 50 = 1950; IoU ≈ 0.026
      const native = textChunk("p1-t1", "Native", 0, 0, 100, 10);
      const ocr = ocrChunk("p1-o1", "OCR text", 95, 0, 100, 10);

      const result = deduplicateMixedPage([native, ocr]);

      expect(result).toHaveLength(2);
      expect(result.some((c) => c.source === "text")).toBe(true);
      expect(result.some((c) => c.source === "ocr")).toBe(true);
    });

    it("drops OCR chunk at exactly 50 % IoU boundary", () => {
      // Native: x:[0, 100], y:[0, 10]  area = 1000
      // OCR:    x:[0, 100], y:[5, 10]  area = 500
      // Intersection: x:[0,100], y:[5,10] → 100 * 5 = 500; union = 1000 + 500 - 500 = 1000; IoU = 0.5
      const native = textChunk("p1-t1", "Native", 0, 0, 100, 10);
      const ocr = ocrChunk("p1-o1", "OCR", 0, 5, 100, 5);

      const result = deduplicateMixedPage([native, ocr]);

      // IoU >= 0.5 → OCR is dropped.
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("text");
    });

    it("keeps OCR chunk at just below 50 % IoU", () => {
      // Native: x:[0, 100], y:[0, 10]  area = 1000
      // OCR:    x:[0, 100], y:[5.01, 10]  area ≈ 499
      // Intersection ≈ 100 * 4.99 = 499; union ≈ 1000 + 499 - 499 = 1000; IoU ≈ 0.499
      const native = textChunk("p1-t1", "Native", 0, 0, 100, 10);
      const ocr = ocrChunk("p1-o1", "OCR", 0, 5.01, 100, 4.99);

      const result = deduplicateMixedPage([native, ocr]);

      expect(result).toHaveLength(2);
    });

    it("falls back to text comparison when chunks lack bbox", () => {
      const native: ExtractionChunk = {
        chunkId: "p1-t1",
        text: "Some text",
        source: "text",
        confidence: 1.0,
      };
      const ocr: ExtractionChunk = {
        chunkId: "p1-o1",
        text: "Totally different OCR text",
        source: "ocr",
        confidence: 0.9,
      };

      const result = deduplicateMixedPage([native, ocr]);

      // No bboxes → text comparison. Different text → both kept.
      expect(result).toHaveLength(2);
    });
  });

  /* ── Sorting / reading order ─────────────────────────────────────── */

  describe("reading-order sort", () => {
    it("sorts results by bbox.y then bbox.x (top-left first)", () => {
      // Input is out of order; output should be sorted by y, then x.
      const chunks = [
        ocrChunk("o3", "third line", 0, 20, 100, 10),
        textChunk("t1", "first line", 0, 0, 100, 10),
        ocrChunk("o2", "second line", 0, 10, 100, 10),
      ];

      const result = deduplicateMixedPage(chunks);

      expect(result.map((c) => c.chunkId)).toEqual(["t1", "o2", "o3"]);
    });

    it("sorts by x when y values are equal", () => {
      const chunks = [
        textChunk("right", "right column", 100, 0, 100, 10),
        textChunk("left", "left column", 0, 0, 100, 10),
      ];

      const result = deduplicateMixedPage(chunks);

      expect(result.map((c) => c.chunkId)).toEqual(["left", "right"]);
    });

    it("chunks without bbox sort to the top (y=0, x=0 default)", () => {
      const withBbox = textChunk("with-bbox", "text", 50, 50, 100, 10);
      const noBbox: ExtractionChunk = {
        chunkId: "no-bbox",
        text: "text",
        source: "text",
        confidence: 1.0,
      };

      const result = deduplicateMixedPage([withBbox, noBbox]);

      // no-bbox defaults to (0,0) → sorts before (50,50).
      expect(result[0].chunkId).toBe("no-bbox");
      expect(result[1].chunkId).toBe("with-bbox");
    });
  });

  /* ── Edge cases ──────────────────────────────────────────────────── */

  describe("edge cases", () => {
    it("returns an empty array for empty input", () => {
      expect(deduplicateMixedPage([])).toEqual([]);
    });

    it("returns all native chunks when there are no OCR chunks", () => {
      const chunks = [
        textChunk("t1", "line 1", 0, 0),
        textChunk("t2", "line 2", 0, 10),
      ];

      const result = deduplicateMixedPage(chunks);

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.source === "text")).toBe(true);
    });

    it("returns all OCR chunks when there are no native chunks", () => {
      const chunks = [
        ocrChunk("o1", "line 1", 0, 0),
        ocrChunk("o2", "line 2", 0, 10),
      ];

      const result = deduplicateMixedPage(chunks);

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.source === "ocr")).toBe(true);
    });

    it("does not modify the original array", () => {
      const chunks = [
        textChunk("t1", "a", 0, 0),
        ocrChunk("o1", "b", 0, 0),
      ];
      const original = [...chunks];

      deduplicateMixedPage(chunks);

      expect(chunks).toEqual(original);
    });

    it("preserves all non-duplicate OCR chunks alongside native chunks", () => {
      const chunks = [
        textChunk("t1", "native line one", 0, 0),
        ocrChunk("o1", "native line one", 0, 0), // duplicate → dropped
        ocrChunk("o2", "unique ocr line", 0, 10),
        textChunk("t2", "native line two", 0, 20),
      ];

      const result = deduplicateMixedPage(chunks);

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.chunkId).sort()).toEqual(["o2", "t1", "t2"]);
    });
  });
});
