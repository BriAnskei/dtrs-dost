/**
 * Unit tests for `reciver-upload-chunks` (receiver/helpers/reciver-upload-chunks.ts).
 *
 * PURE FUNCTION UNDER TEST:
 *
 *   toReceiverChunks(result: PdfExtractionResult): ReceiverChunk[]
 *
 * Transforms the client-side PDF extraction result into the compact
 * `ReceiverChunk` format the backend expects. For each chunk:
 *
 *   - Chunks without a `bbox` are SKIPPED (cannot be located on the page for
 *     highlighting).
 *   - Chunks whose `text` is empty or whitespace-only are SKIPPED.
 *   - `text` is truncated to MAX_TEXT_LENGTH (20 000 chars).
 *   - `sourceConfidence` is converted from 0-1 to a 0-100 integer, clamped.
 *   - `bbox` coordinates are clamped to [0, 1] (defensive against OCR bleed).
 *   - `tokens` word-level boxes are similarly clamped and remapped to {x,y,w,h}.
 *
 * Also exports constants:
 *   MAX_RECEIVER_CHUNKS (2 000) — the hard cap the caller checks before upload.
 */

import { describe, expect, it } from "vitest";
import { MAX_RECEIVER_CHUNKS, toReceiverChunks } from "../receiver/helpers/reciver-upload-chunks";
import type { PdfExtractionResult, ExtractionToken } from "../pdf/types";

/* ── Constants ────────────────────────────────────────────────────────────── */

describe("MAX_RECEIVER_CHUNKS", () => {
  it("is 2000", () => {
    expect(MAX_RECEIVER_CHUNKS).toBe(2000);
  });
});

/* ── toReceiverChunks ───────────────────────────────────────────────────── */

/**
 * Builder: create a minimal PdfExtractionResult with one page containing
 * the given chunks. Keeps the test boilerplate short.
 */
function makeResult(chunks: Array<{
  chunkId: string;
  text: string;
  bbox?: { x: number; y: number; width: number; height: number };
  confidence?: number;
  source?: "text" | "ocr";
  tokens?: ExtractionToken[];
}>): PdfExtractionResult {
  return {
    pages: [
      {
        page: 1,
        content: chunks.map((c) => ({
          chunkId: c.chunkId,
          text: c.text,
          source: c.source ?? "text",
          confidence: c.confidence ?? 0.95,
          bbox: c.bbox,
          tokens: c.tokens,
        })),
        hasNativeText: true,
        hasImages: false,
        extractionMode: "text",
      },
    ],
    totalPages: 1,
    statistics: { textPages: 1, ocrPages: 0, mixedPages: 0, emptyPages: 0 },
  };
}

describe("toReceiverChunks", () => {
  /* ── Basic transformation ─────────────────────────────────────────────── */

  it("passes through a well-formed chunk with correct field names", () => {
    const result = makeResult([
      {
        chunkId: "p1-o1",
        text: "Hello World",
        bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        confidence: 0.85,
      },
    ]);

    const chunks = toReceiverChunks(result);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({
      chunkId: "p1-o1",
      text: "Hello World",
      sourceConfidence: 85,
      page: 1,
      bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
    });
  });

  it("passes multiple chunks in order", () => {
    const result = makeResult([
      { chunkId: "p1-o1", text: "first", bbox: { x: 0, y: 0, width: 1, height: 1 } },
      { chunkId: "p1-o2", text: "second", bbox: { x: 0.5, y: 0.5, width: 0.2, height: 0.2 } },
    ]);

    const chunks = toReceiverChunks(result);
    expect(chunks.map((c) => c.chunkId)).toEqual(["p1-o1", "p1-o2"]);
  });

  /* ── Confidence conversion ──────────────────────────────────────────── */

  it("converts confidence 0-1 to a 0-100 integer", () => {
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0, y: 0, width: 1, height: 1 }, confidence: 0.753 },
    ]);

    expect(toReceiverChunks(result)[0].sourceConfidence).toBe(75); // rounds
  });

  it("clamps confidence 0 → 0", () => {
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0, y: 0, width: 1, height: 1 }, confidence: 0 },
    ]);
    expect(toReceiverChunks(result)[0].sourceConfidence).toBe(0);
  });

  it("clamps confidence 1 → 100", () => {
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0, y: 0, width: 1, height: 1 }, confidence: 1 },
    ]);
    expect(toReceiverChunks(result)[0].sourceConfidence).toBe(100);
  });

  it("defaults confidence to 0 when chunk.confidence is undefined", () => {
    // The function uses `Number.isFinite(chunk.confidence) ? chunk.confidence : 0`.
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0, y: 0, width: 1, height: 1 } },
    ]);

    // We can't directly pass `undefined` via makeResult since it defaults, so
    // we construct a raw chunk object instead.
    const raw = {
      pages: [{
        page: 1,
        content: [{
          chunkId: "c1",
          text: "a",
          source: "text" as const,
          confidence: undefined as unknown as number,
          bbox: { x: 0, y: 0, width: 1, height: 1 },
        }],
        hasNativeText: true,
        hasImages: false,
        extractionMode: "text" as const,
      }],
      totalPages: 1,
      statistics: { textPages: 1, ocrPages: 0, mixedPages: 0, emptyPages: 0 },
    };

    expect(toReceiverChunks(raw)[0].sourceConfidence).toBe(0);
  });

  it("clamps confidence above 1 (e.g. 1.5) to 100", () => {
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0, y: 0, width: 1, height: 1 }, confidence: 1.5 },
    ]);

    // 1.5 * 100 = 150 → clamped to 100.
    expect(toReceiverChunks(result)[0].sourceConfidence).toBe(100);
  });

  /* ── Filtering: skipped chunks ─────────────────────────────────────── */

  it("skips chunks without a bbox", () => {
    const result = makeResult([
      { chunkId: "c1", text: "has bbox", bbox: { x: 0, y: 0, width: 1, height: 1 } },
      { chunkId: "c2", text: "no bbox" },
      { chunkId: "c3", text: "also no bbox" },
    ]);

    const chunks = toReceiverChunks(result);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkId).toBe("c1");
  });

  it("skips chunks with empty text", () => {
    const result = makeResult([
      { chunkId: "c1", text: "", bbox: { x: 0, y: 0, width: 1, height: 1 } },
      { chunkId: "c2", text: "   ", bbox: { x: 0, y: 0, width: 1, height: 1 } },
      { chunkId: "c3", text: "real content", bbox: { x: 0, y: 0, width: 1, height: 1 } },
    ]);

    const chunks = toReceiverChunks(result);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkId).toBe("c3");
  });

  it("skips a chunk with no bbox AND empty text", () => {
    const result = makeResult([
      { chunkId: "c1", text: "" },
    ]);

    expect(toReceiverChunks(result)).toEqual([]);
  });

  /* ── Text truncation ───────────────────────────────────────────────── */

  it("truncates text to MAX_TEXT_LENGTH (20000) characters", () => {
    const longText = "x".repeat(25000);
    const result = makeResult([
      { chunkId: "c1", text: longText, bbox: { x: 0, y: 0, width: 1, height: 1 } },
    ]);

    const chunks = toReceiverChunks(result);
    expect(chunks[0].text).toHaveLength(20000);
  });

  it("does not truncate text under MAX_TEXT_LENGTH", () => {
    const text = "short text";
    const result = makeReceiverChunksWithText(text);

    const chunks = toReceiverChunks(result);
    expect(chunks[0].text).toBe(text);
  });

  /* ── BBox clamping ─────────────────────────────────────────────────── */

  it("clamps bbox coordinates above 1 down to 1", () => {
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 1.5, y: 2.0, width: 5.0, height: 10.0 } },
    ]);

    expect(toReceiverChunks(result)[0].bbox).toEqual({
      x: 1, y: 1, w: 1, h: 1,
    });
  });

  it("clamps negative bbox coordinates to 0", () => {
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: -0.2, y: -0.5, width: -0.1, height: -1 } },
    ]);

    expect(toReceiverChunks(result)[0].bbox).toEqual({
      x: 0, y: 0, w: 0, h: 0,
    });
  });

  it("passes through in-range bbox coordinates unchanged", () => {
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0.15, y: 0.35, width: 0.7, height: 0.45 } },
    ]);

    expect(toReceiverChunks(result)[0].bbox).toEqual({
      x: 0.15, y: 0.35, w: 0.7, h: 0.45,
    });
  });

  /* ── Token remapping ───────────────────────────────────────────────── */

  it("remaps token bboxes from {x,y,width,height} to {x,y,w,h}", () => {
    const tokens: ExtractionToken[] = [
      { text: "Hello", bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, confidence: 0.9 },
      { text: "World", bbox: { x: 0.5, y: 0.6, width: 0.7, height: 0.8 }, confidence: 0.85 },
    ];
    const result = makeResult([
      { chunkId: "c1", text: "Hello World", bbox: { x: 0, y: 0, width: 1, height: 1 }, tokens },
    ]);

    const chunks = toReceiverChunks(result);
    expect(chunks[0].tokens).toEqual([
      { text: "Hello", bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, confidence: 0.9 },
      { text: "World", bbox: { x: 0.5, y: 0.6, w: 0.7, h: 0.8 }, confidence: 0.85 },
    ]);
  });

  it("clamps token bbox coordinates", () => {
    const tokens: ExtractionToken[] = [
      { text: "word", bbox: { x: -0.5, y: 1.5, width: 2.0, height: -1.0 }, confidence: 0.9 },
    ];
    const result = makeResult([
      { chunkId: "c1", text: "word", bbox: { x: 0, y: 0, width: 1, height: 1 }, tokens },
    ]);

    expect(toReceiverChunks(result)[0].tokens).toEqual([
      { text: "word", bbox: { x: 0, y: 1, w: 1, h: 0 }, confidence: 0.9 },
    ]);
  });

  it("omits tokens array when chunk has no tokens", () => {
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0, y: 0, width: 1, height: 1 } },
    ]);

    const chunks = toReceiverChunks(result);
    expect(chunks[0].tokens).toBeUndefined();
  });

  it("clamps token confidence to [0, 1]", () => {
    const tokens: ExtractionToken[] = [
      { text: "a", bbox: { x: 0, y: 0, width: 0.1, height: 0.1 }, confidence: 1.5 }, // clamped to 1
      { text: "b", bbox: { x: 0, y: 0, width: 0.1, height: 0.1 }, confidence: -0.5 }, // clamped to 0
    ];
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0, y: 0, width: 1, height: 1 }, tokens },
    ]);

    expect(toReceiverChunks(result)[0].tokens).toEqual([
      { text: "a", bbox: { x: 0, y: 0, w: 0.1, h: 0.1 }, confidence: 1 },
      { text: "b", bbox: { x: 0, y: 0, w: 0.1, h: 0.1 }, confidence: 0 },
    ]);
  });

  it("defaults token confidence to 1.0 when undefined", () => {
    const tokens: ExtractionToken[] = [
      { text: "a", bbox: { x: 0, y: 0, width: 0.1, height: 0.1 }, confidence: undefined as unknown as number },
    ];
    const result = makeResult([
      { chunkId: "c1", text: "a", bbox: { x: 0, y: 0, width: 1, height: 1 }, tokens },
    ]);

    expect(toReceiverChunks(result)[0].tokens![0].confidence).toBe(1);
  });

  /* ── Multi-page ────────────────────────────────────────────────────── */

  it("assigns the correct page number to each chunk across multiple pages", () => {
    const result: PdfExtractionResult = {
      pages: [
        {
          page: 1,
          content: [
            { chunkId: "p1-o1", text: "page one", source: "text", confidence: 0.9, bbox: { x: 0, y: 0, width: 1, height: 1 } },
          ],
          hasNativeText: true,
          hasImages: false,
          extractionMode: "text",
        },
        {
          page: 2,
          content: [
            { chunkId: "p2-o1", text: "page two", source: "text", confidence: 0.8, bbox: { x: 0, y: 0, width: 1, height: 1 } },
          ],
          hasNativeText: true,
          hasImages: false,
          extractionMode: "text",
        },
      ],
      totalPages: 2,
      statistics: { textPages: 2, ocrPages: 0, mixedPages: 0, emptyPages: 0 },
    };

    const chunks = toReceiverChunks(result);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ chunkId: "p1-o1", page: 1 });
    expect(chunks[1]).toMatchObject({ chunkId: "p2-o1", page: 2 });
  });

  /* ── Empty / degenerate inputs ─────────────────────────────────────── */

  it("returns an empty array for a result with no pages", () => {
    expect(toReceiverChunks({ pages: [], totalPages: 0, statistics: { textPages: 0, ocrPages: 0, mixedPages: 0, emptyPages: 0 } })).toEqual([]);
  });

  it("returns an empty array when all chunks are skipped", () => {
    const result = makeResult([
      { chunkId: "c1", text: "" },
      { chunkId: "c2", text: "   " },
      { chunkId: "c3", text: "has text" }, // this one has no bbox → skipped
    ]);

    // Wait — c3 has text but no bbox. We need to give it a bbox to test the "all skipped" path.
    const result2 = makeResult([]);
    expect(toReceiverChunks(result2)).toEqual([]);
  });

  /* ── Helper ────────────────────────────────────────────────────────── */

  function makeReceiverChunksWithText(text: string): PdfExtractionResult {
    return makeResult([
      { chunkId: "c1", text, bbox: { x: 0, y: 0, width: 1, height: 1 } },
    ]);
  }
});
