/**
 * Unit tests for `resolveHighlights` (highlight-helpers.ts).
 *
 * THE FUNCTION UNDER TEST:
 *
 *   resolveHighlights(
 *     field: FieldKey,
 *     value: string,
 *     chunkIds: string[],
 *     chunksById: Map<string, ExtractionChunk>,
 *     locations: Record<string, ChunkLocation>,
 *   ): FieldHighlight[]
 *
 * For each chunkId the field cites, it returns a highlight box. The strategy
 * depends on whether the field is "chunk-level" or "word-level":
 *
 *   - CHUNK_LEVEL_FIELDS (e.g. "summary"): the LLM wrote the value itself,
 *     so we cannot do a word match. The whole chunk bbox is used.
 *
 *   - Word-level fields (subject, from, to, dateReceived, dateReleased): if
 *     the chunk has word-level tokens, `findValueBox` narrows to the tightest
 *     box around matching words. If no word match is found (or no tokens),
 *     fall back to the whole chunk bbox.
 *
 * Chunks whose chunkId is absent from `locations` produce no highlight (the
 * chunk exists in the source extraction but has no geometry, e.g. an empty
 * line).
 */

import { describe, expect, it } from "vitest";
import { resolveHighlights, toBBox } from "../helpers/highlight-helpers";
import type { BoundingBox, ExtractionToken } from "../pdf/types";
import type { FieldKey, ChunkLocation, FieldHighlight } from "../types/extraction-types";
import type { ExtractionChunk } from "../pdf/types";

function token(text: string, bbox: BoundingBox, confidence = 1.0): ExtractionToken {
  return { text, bbox, confidence };
}

function chunk(id: string, params: {
  text: string;
  bbox?: BoundingBox;
  tokens?: ExtractionToken[];
  source?: "text" | "ocr";
  confidence?: number;
}): ExtractionChunk {
  return {
    chunkId: id,
    text: params.text,
    source: params.source ?? "text",
    confidence: params.confidence ?? 1.0,
    bbox: params.bbox,
    tokens: params.tokens,
  } as ExtractionChunk;
}

function location(page: number, bbox: { x: number; y: number; width: number; height: number }): ChunkLocation {
  return {
    page,
    bbox: { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height },
    text: "",
  };
}

describe("resolveHighlights", () => {
  /* ── toBBox helper ───────────────────────────────────────────────── */

  describe("toBBox", () => {
    it("converts {x, y, width, height} to {x, y, w, h}", () => {
      expect(toBBox({ x: 10, y: 20, width: 30, height: 40 })).toEqual({
        x: 10,
        y: 20,
        w: 30,
        h: 40,
      });
    });
  });

  /* ── Chunk-level fields (summary) ────────────────────────────────── */

  describe("chunk-level fields (summary)", () => {
    it("uses the whole chunk bbox for summary fields, ignoring tokens", () => {
      const field: FieldKey = "summary";
      const chunkIds = ["p1-o1"];
      const chunksById = new Map([
        [
          "p1-o1",
          chunk("p1-o1", {
            text: "LLM-written summary",
            tokens: [token("LLM-written", { x: 0, y: 0, width: 5, height: 2 })],
          }),
        ],
      ]);
      const locations: Record<string, ChunkLocation> = {
        "p1-o1": location(1, { x: 10, y: 20, width: 100, height: 50 }),
      };

      const result = resolveHighlights(field, "LLM-written summary", chunkIds, chunksById, locations);

      // Summary → whole chunk bbox, no word-level narrowing.
      expect(result).toEqual([{ page: 1, bbox: { x: 10, y: 20, w: 100, h: 50 } }]);
    });

    it("returns highlights for each cited chunkId", () => {
      const chunkIds = ["p1-o1", "p1-o2"];
      const locations: Record<string, ChunkLocation> = {
        "p1-o1": location(1, { x: 0, y: 0, width: 50, height: 10 }),
        "p1-o2": location(1, { x: 0, y: 10, width: 50, height: 10 }),
      };

      const result = resolveHighlights("summary", "some text", chunkIds, new Map(), locations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ page: 1, bbox: { x: 0, y: 0, w: 50, h: 10 } });
      expect(result[1]).toEqual({ page: 1, bbox: { x: 0, y: 10, w: 50, h: 10 } });
    });
  });

  /* ── Word-level fields ───────────────────────────────────────────── */

  describe("word-level fields", () => {
    it("narrows to matching word bbox when tokens are available", () => {
      const field: FieldKey = "subject";
      const chunkIds = ["p1-o1"];
      const chunksById = new Map([
        [
          "p1-o1",
          chunk("p1-o1", {
            text: "Subject: Foo Bar",
            tokens: [
              token("Subject:", { x: 0, y: 0, width: 10, height: 2 }),
              token("Foo", { x: 12, y: 0, width: 6, height: 2 }),
              token("Bar", { x: 20, y: 0, width: 6, height: 2 }),
            ],
          }),
        ],
      ]);
      const locations: Record<string, ChunkLocation> = {
        "p1-o1": location(1, { x: 0, y: 0, width: 30, height: 5 }),
      };

      const result = resolveHighlights(field, "Foo", chunkIds, chunksById, locations);

      // findValueBox should narrow to "Foo" token bbox, not the whole chunk.
      expect(result).toEqual([{ page: 1, bbox: { x: 12, y: 0, w: 6, h: 2 } }]);
    });

    it("falls back to whole chunk bbox when findValueBox returns null (no word match)", () => {
      const field: FieldKey = "subject";
      const chunkIds = ["p1-o1"];
      const chunksById = new Map([
        [
          "p1-o1",
          chunk("p1-o1", {
            text: "Some text",
            tokens: [
              token("Some", { x: 0, y: 0, width: 5, height: 2 }),
              token("text", { x: 6, y: 0, width: 5, height: 2 }),
            ],
          }),
        ],
      ]);
      const locations: Record<string, ChunkLocation> = {
        "p1-o1": location(1, { x: 0, y: 0, width: 30, height: 5 }),
      };

      const result = resolveHighlights(field, "Nonexistent", chunkIds, chunksById, locations);

      // No word match → fall back to whole chunk bbox.
      expect(result).toEqual([{ page: 1, bbox: { x: 0, y: 0, w: 30, h: 5 } }]);
    });

    it("falls back to whole chunk bbox when tokens are not available", () => {
      const field: FieldKey = "from";
      const chunkIds = ["p1-o1"];
      const chunksById = new Map([
        ["p1-o1", chunk("p1-o1", { text: "From: Someone", tokens: undefined })],
      ]);
      const locations: Record<string, ChunkLocation> = {
        "p1-o1": location(2, { x: 0, y: 0, width: 80, height: 10 }),
      };

      const result = resolveHighlights(field, "Someone", chunkIds, chunksById, locations);

      // No tokens → whole chunk bbox.
      expect(result).toEqual([{ page: 2, bbox: { x: 0, y: 0, w: 80, h: 10 } }]);
    });

    it("handles a value spanning multiple tokens", () => {
      const field: FieldKey = "subject";
      const chunkIds = ["p1-o1"];
      const chunksById = new Map([
        [
          "p1-o1",
          chunk("p1-o1", {
            text: "Request for Project Inspection",
            tokens: [
              token("Request", { x: 0, y: 0, width: 10, height: 2 }),
              token("for", { x: 12, y: 0, width: 4, height: 2 }),
              token("Project", { x: 18, y: 0, width: 10, height: 2 }),
              token("Inspection", { x: 30, y: 0, width: 12, height: 2 }),
            ],
          }),
        ],
      ]);
      const locations: Record<string, ChunkLocation> = {
        "p1-o1": location(1, { x: 0, y: 0, width: 50, height: 5 }),
      };

      const result = resolveHighlights(
        field,
        "Request for Project Inspection",
        chunkIds,
        chunksById,
        locations,
      );

      // Merged bbox of all four tokens.
      expect(result).toEqual([{ page: 1, bbox: { x: 0, y: 0, w: 42, h: 2 } }]);
    });
  });

  /* ── Missing / edge cases ────────────────────────────────────────── */

  describe("missing locations and chunks", () => {
    it("returns an empty array when a chunkId has no location", () => {
      const chunkIds = ["p1-o1"];
      const chunksById = new Map([
        ["p1-o1", chunk("p1-o1", { text: "text" })],
      ]);
      const locations: Record<string, ChunkLocation> = {}; // missing

      const result = resolveHighlights("subject", "text", chunkIds, chunksById, locations);

      expect(result).toEqual([]);
    });

    it("skips chunkIds with no location but processes the rest", () => {
      const chunkIds = ["p1-o1", "p1-o2", "p1-o3"];
      const locations: Record<string, ChunkLocation> = {
        "p1-o1": location(1, { x: 0, y: 0, width: 50, height: 10 }),
        "p1-o3": location(1, { x: 0, y: 10, width: 50, height: 10 }),
      };

      const result = resolveHighlights("summary", "text", chunkIds, new Map(), locations);

      // p1-o2 has no location → skipped.
      expect(result).toHaveLength(2);
      expect(result[0].page).toBe(1);
      expect(result[1].page).toBe(1);
    });

    it("handles an empty chunkIds array", () => {
      const result = resolveHighlights(
        "subject",
        "nothing",
        [],
        new Map(),
        {},
      );

      expect(result).toEqual([]);
    });

    it("returns one highlight per chunkId when multiple cite the same value", () => {
      const chunkIds = ["p1-o1", "p2-o1"];
      const locations: Record<string, ChunkLocation> = {
        "p1-o1": location(1, { x: 0, y: 0, width: 50, height: 10 }),
        "p2-o1": location(2, { x: 0, y: 0, width: 50, height: 10 }),
      };

      const result = resolveHighlights("summary", "Foo", chunkIds, new Map(), locations);

      expect(result).toHaveLength(2);
      expect(result[0].page).toBe(1);
      expect(result[1].page).toBe(2);
    });
  });
});
