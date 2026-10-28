/**
 * Unit tests for `toOutcome` — the helper that converts an
 * `ExtractedDocumentQueueDetail` (the server-provided review payload) into the
 * `ExtractionOutcome` shape that the review-step components consume.
 *
 * THE FUNCTION (helpers/to-outcome.ts):
 *
 *   toOutcome(detail: ExtractedDocumentQueueDetail): ExtractionOutcome
 *
 * Responsibilities:
 *   - Maps each `FIELDS_BY_DIRECTION.incoming` field key to a ResultRow.
 *   - For a missing field: value=null, empty highlights, null confidences.
 *   - For a present field: takes value, chunkIds (filtered to valid chunks),
 *     highlights (resolved from chunk text + bboxes), and the three confidence
 *     numbers.
 *   - Builds a chunksById Map from chunk_locations for resolveHighlights.
 *   - Computes `decision` from `detail.decision` (pass-through) and
 *     `minEffective` via the `decide()` helper from extraction-helpers.
 *
 * We mock nothing — `toOutcome`, `decide`, and `resolveHighlights` are pure
 * functions with no side effects.
 */

import { describe, expect, it } from "vitest";

import { toOutcome } from "../helpers/to-outcome";
import type { ExtractedDocumentQueueDetail } from "../types/extracted-document-queue.types";

/* ─── Fixtures ─────────────────────────────────────────────────────────────── */

/**
 * Minimal chunk location with everything `buildChunksById` reads:
 * loc.text (chunk text) and loc.tokens (per-word bboxes used by resolveHighlights).
 */
function makeChunkLocation(loc: {
  page?: number;
  text?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  sourceConfidence?: number;
  tokens?: { text: string; bbox: { x: number; y: number; w: number; h: number }; confidence?: number }[];
}): NonNullChunkLocation {
  return {
    page: loc.page ?? 1,
    text: loc.text ?? "default chunk text",
    bbox: { x: loc.x ?? 0, y: loc.y ?? 0, w: loc.w ?? 0.5, h: loc.h ?? 0.1 },
    sourceConfidence: loc.sourceConfidence,
    tokens: loc.tokens,
  } as NonNullChunkLocation;
}

type NonNullChunkLocation = Required<Pick<ChunkLocation, "page" | "text" | "bbox">> &
  Pick<ChunkLocation, "sourceConfidence" | "tokens"> & {
    bbox: { x: number; y: number; w: number; h: number };
  };

import type { ChunkLocation } from "../../extraction/types/extraction-types";

/**
 * Build a detail payload. Caller overrides fields / chunk_locations.
 *
 * `decision` defaults to REVIEW so `minEffective` computation is exercised.
 * `status` defaults to APPROVED (already approved after creation).
 */
function makeDetail(overrides: Partial<ExtractedDocumentQueueDetail> = {}): ExtractedDocumentQueueDetail {
  return {
    id: "queue-1",
    file_name: "invoice.pdf",
    uploader_name: "Jane Doe",
    decision: "REVIEW",
    status: "APPROVED",
    created_at: "2026-10-01T10:00:00Z",
    fields: [],
    chunk_locations: {},
    ...overrides,
  };
}

/* ─── Tests ─────────────────────────────────────────────────────────────────── */

describe("toOutcome", () => {
  describe("structure mapping", () => {
    it("returns rows for every incoming FIELDS_BY_DIRECTION key (5 fields)", () => {
      /*
       * toOutcome maps over FIELDS_BY_DIRECTION.incoming, which is always
       * [subject, from, to, dateReceived, summary] — 5 entries.
       */
      const outcome = toOutcome(makeDetail());

      expect(outcome.rows).toHaveLength(5);
      const fields = outcome.rows.map((r) => r.field);
      expect(fields).toEqual(["subject", "from", "to", "dateReceived", "summary"]);
    });

    it("passes detail.decision through as outcome.decision", () => {
      for (const decision of ["ACCEPT", "REVIEW", "INVALID"] as const) {
        const outcome = toOutcome(makeDetail({ decision }));
        expect(outcome.decision).toBe(decision);
      }
    });

    it("passes chunk_locations through as outcome.chunkLocations", () => {
      const chunkLocations = {
        "p1-o1": makeChunkLocation({ page: 1, text: "hello" }),
      };

      const outcome = toOutcome(makeDetail({ chunk_locations: chunkLocations }));

      expect(outcome.chunkLocations).toBe(chunkLocations);
    });
  });

  describe("field rows", () => {
    it("builds a ResultRow with value, chunkIds, and confidences for a present field", () => {
      const chunkLocations = {
        "p1-o1": makeChunkLocation({ text: "Meeting at 10am", tokens: [] }),
        "p1-o2": makeChunkLocation({ text: "on 2026-10-15", tokens: [] }),
      };

      const outcome = toOutcome(
        makeDetail({
          chunk_locations: chunkLocations,
          fields: [
            {
              field: "subject",
              value: "Meeting Notes",
              chunkIds: ["p1-o1", "p1-o2"],
              aiConfidence: 90,
              sourceConfidence: 95,
              effectiveConfidence: 85,
            },
          ],
        }),
      );

      const subjectRow = outcome.rows.find((r) => r.field === "subject");
      expect(subjectRow).toBeDefined();
      expect(subjectRow!.value).toBe("Meeting Notes");
      expect(subjectRow!.chunkIds).toEqual(["p1-o1", "p1-o2"]);
      expect(subjectRow!.aiConfidence).toBe(90);
      expect(subjectRow!.sourceConfidence).toBe(95);
      expect(subjectRow!.effectiveConfidence).toBe(85);
    });

    it("produces null value with empty arrays and null confidences for a missing field", () => {
      /*
       * When a field has no extracted value, the row should be:
       *   value: null, chunkIds: [], highlights: [], all confidences: null
       * This is what drives the "Not found" rendering in ReviewFieldList.
       */
      const outcome = toOutcome(makeDetail());

      const subjectRow = outcome.rows.find((r) => r.field === "subject");
      expect(subjectRow!.value).toBeNull();
      expect(subjectRow!.chunkIds).toEqual([]);
      expect(subjectRow!.highlights).toEqual([]);
      expect(subjectRow!.aiConfidence).toBeNull();
      expect(subjectRow!.sourceConfidence).toBeNull();
      expect(subjectRow!.effectiveConfidence).toBeNull();
    });

    it("filters chunkIds to only those present in chunk_locations", () => {
      /*
       * The server may return chunkIds that reference chunks that were dropped
       * (e.g. legacy rows uploaded before geometry was stored). Only chunks
       * present in chunk_locations are kept so resolveHighlights doesn't break.
       */
      const chunkLocations = {
        "p1-o1": makeChunkLocation({ text: "kept chunk", tokens: [] }),
      };

      const outcome = toOutcome(
        makeDetail({
          chunk_locations: chunkLocations,
          fields: [
            {
              field: "subject",
              value: "test",
              chunkIds: ["p1-o1", "p9-missing"],
              aiConfidence: 90,
              sourceConfidence: 95,
              effectiveConfidence: 85,
            },
          ],
        }),
      );

      const subjectRow = outcome.rows.find((r) => r.field === "subject");
      expect(subjectRow!.chunkIds).toEqual(["p1-o1"]);
    });

    it("page is null when there are no highlights", () => {
      const outcome = toOutcome(makeDetail());

      const subjectRow = outcome.rows.find((r) => r.field === "subject");
      expect(subjectRow!.page).toBeNull();
    });

    it("sets page from the first highlight when value present and chunks exist", () => {
      const outcome = toOutcome(
        makeDetail({
          chunk_locations: {
            "p1-o1": makeChunkLocation({ page: 2, text: "Meeting", tokens: [] }),
          },
          fields: [
            {
              field: "subject",
              value: "Meeting",
              chunkIds: ["p1-o1"],
              aiConfidence: 90,
              sourceConfidence: 95,
              effectiveConfidence: 85,
            },
          ],
        }),
      );

      const subjectRow = outcome.rows.find((r) => r.field === "subject");
      expect(subjectRow!.highlights).toHaveLength(1);
      expect(subjectRow!.highlights[0].page).toBe(2);
      expect(subjectRow!.page).toBe(2);
    });
  });

  describe("minEffective computation", () => {
    it("computes minEffective from the rows' effective confidences", () => {
      /*
       * `decide()` returns minEffective = Math.min of all non-null
       * effectiveConfidence values. With [90, 95, 80, 70, 85] → min is 70.
       */
      const outcome = toOutcome(
        makeDetail({
          fields: [
            { field: "subject", value: "a", chunkIds: [], aiConfidence: 90, sourceConfidence: 100, effectiveConfidence: 90 },
            { field: "from", value: "b", chunkIds: [], aiConfidence: 95, sourceConfidence: 100, effectiveConfidence: 95 },
            { field: "to", value: "c", chunkIds: [], aiConfidence: 80, sourceConfidence: 100, effectiveConfidence: 80 },
            { field: "dateReceived", value: "2026-10-15", chunkIds: [], aiConfidence: 70, sourceConfidence: 100, effectiveConfidence: 70 },
            { field: "summary", value: "d", chunkIds: [], aiConfidence: 85, sourceConfidence: 100, effectiveConfidence: 85 },
          ],
        }),
      );

      expect(outcome.minEffective).toBe(70);
    });

    it("minEffective is null when any field has null effectiveConfidence", () => {
      /*
       * `decide()` returns `{ decision: "INVALID", minEffective: null }` when
       * any row has a null value or null effectiveConfidence.
       */
      const outcome = toOutcome(makeDetail()); // all fields missing → all null

      expect(outcome.minEffective).toBeNull();
    });
  });
});
