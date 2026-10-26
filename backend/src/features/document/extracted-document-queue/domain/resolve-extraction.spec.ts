/**
 * Unit tests for `resolveExtraction` — the pure domain function that merges
 * LLM-extracted fields with receiver-supplied chunk source-confidence.
 *
 * THE FUNCTION (domain/resolve-extraction.ts):
 *
 *   resolveExtraction(fields: ExtractedField[], chunks: ExtractedChunk[]): ReceiveDocumentResponse
 *
 * It:
 *   1. Builds a chunkId → sourceConfidence map from `chunks`.
 *   2. Per field:
 *      - If `value === null` OR `aiConfidence === null` → passes through with
 *        `sourceConfidence = null`, `effectiveConfidence = null`.
 *      - Looks up each cited chunkId in the chunks map to collect source
 *        confidences (filtered to numbers only).
 *      - If none found → `sourceConfidence = null`, `effectiveConfidence = null`.
 *      - Else `sourceConfidence = Math.min(...sourceConfidences)` and
 *        `effectiveConfidence = Math.round(aiConfidence * sourceConfidence / 100)`.
 *   3. Decision:
 *      - Any field with `value === null` OR `aiConfidence === null` OR
 *        `effectiveConfidence === null` → "INVALID".
 *      - Otherwise, `minEffectiveConfidence >= ACCEPT_CONFIDENCE_THRESHOLD (90)`
 *        → "ACCEPT", else "REVIEW".
 *
 * ACCEPT_CONFIDENCE_THRESHOLD = 90 (see extration-queue.constant.ts).
 *
 * SCENARIOS:
 *   - Single-cited chunk: effective = round(ai * source / 100).
 *   - Multi-cited chunk: source = min across cited chunks.
 *   - Chunk missing from chunks map → effective null → INVALID.
 *   - Null value / null aiConfidence → INVALID.
 *   - Threshold boundary: effective 90 → ACCEPT; 89 → REVIEW.
 *   - Empty chunks → effective null → INVALID.
 */

import { ExtractedField } from "../../extraction/providers/llm-extractor.interface";
import { ExtractedChunk } from "../types/extracted-types";
import { resolveExtraction } from "./resolve-extraction";

function makeField(
  field: string,
  value: string | null,
  chunkIds: string[],
  aiConfidence: number | null,
): ExtractedField {
  return { field: field as ExtractedField["field"], value, chunkIds, aiConfidence };
}

function makeChunk(
  chunkId: string,
  sourceConfidence: number,
): ExtractedChunk {
  return {
    chunkId,
    text: "chunk text",
    sourceConfidence,
    page: 1,
    bbox: { x: 0, y: 0, w: 0.5, h: 0.5 },
  };
}

describe("resolveExtraction", () => {
  describe("effectiveConfidence", () => {
    it("computes effectiveConfidence = round(aiConfidence * sourceConfidence / 100) for a single cited chunk", () => {
      // ai=90, source=95 → 90*95/100 = 85.5 → round → 86.
      const fields = [makeField("subject", "Foo", ["c1"], 90)];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.fields[0].effectiveConfidence).toBe(86);
      expect(result.fields[0].sourceConfidence).toBe(95);
    });

    it("uses the MIN sourceConfidence when a field cites multiple chunks", () => {
      // cites c1 (source=95) and c2 (source=80) → min=80 → 90*80/100 = 72.
      const fields = [makeField("subject", "Foo", ["c1", "c2"], 90)];
      const chunks = [makeChunk("c1", 95), makeChunk("c2", 80)];

      const result = resolveExtraction(fields, chunks);

      expect(result.fields[0].sourceConfidence).toBe(80);
      expect(result.fields[0].effectiveConfidence).toBe(72);
    });

    it("returns effectiveConfidence = null when a cited chunkId is missing from chunks", () => {
      const fields = [makeField("subject", "Foo", ["c999"], 90)];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.fields[0].sourceConfidence).toBeNull();
      expect(result.fields[0].effectiveConfidence).toBeNull();
    });

    it("returns effectiveConfidence = null when a field has no chunk citations", () => {
      // No chunkIds cited → sourceConfidences empty → null.
      const fields = [makeField("subject", "Foo", [], 90)];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.fields[0].effectiveConfidence).toBeNull();
      expect(result.fields[0].sourceConfidence).toBeNull();
    });

    it("rounds effectiveConfidence to the nearest integer", () => {
      // ai=90, source=96 → 86.4 → 86.
      const fields = [makeField("subject", "Foo", ["c1"], 90)];
      const chunks = [makeChunk("c1", 96)];

      const result = resolveExtraction(fields, chunks);

      expect(result.fields[0].effectiveConfidence).toBe(86);
    });

    it("handles fractional rounding down (.5 rounds up via Math.round)", () => {
      // ai=90, source=95 → 85.5 → Math.round → 86.
      const fields = [makeField("subject", "Foo", ["c1"], 90)];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.fields[0].effectiveConfidence).toBe(86);
    });
  });

  describe("decision — ACCEPT / REVIEW / INVALID", () => {
    it("returns ACCEPT when all fields have effectiveConfidence >= 90", () => {
      // ai=95, source=95 → effective=90 → min=90 → ACCEPT.
      const fields = [
        makeField("subject", "Foo", ["c1"], 95),
        makeField("from", "Bar", ["c1"], 95),
      ];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.decision).toBe("ACCEPT");
    });

    it("returns REVIEW when min effectiveConfidence is below 90", () => {
      // ai=90, source=70 → effective=63 → REVIEW.
      const fields = [
        makeField("subject", "Foo", ["c1"], 90),
        makeField("from", "Bar", ["c1"], 90),
      ];
      const chunks = [makeChunk("c1", 70)];

      const result = resolveExtraction(fields, chunks);

      expect(result.decision).toBe("REVIEW");
    });

    it("returns INVALID when any field value is null", () => {
      const fields = [
        makeField("subject", "Foo", ["c1"], 95),
        makeField("from", null, [], null),
      ];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.decision).toBe("INVALID");
    });

    it("returns INVALID when aiConfidence is null for a field with a value", () => {
      const fields = [
        makeField("subject", "Foo", ["c1"], null),
      ];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.decision).toBe("INVALID");
    });

    it("returns INVALID when a cited chunk is missing (effectiveConfidence null)", () => {
      const fields = [
        makeField("subject", "Foo", ["c999"], 90),
      ];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.decision).toBe("INVALID");
    });

    it("returns INVALID when a field has no chunk citations (effectiveConfidence null)", () => {
      const fields = [
        makeField("subject", "Foo", [], 90),
      ];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.decision).toBe("INVALID");
    });

    it("returns INVALID when chunks array is empty", () => {
      const fields = [
        makeField("subject", "Foo", ["c1"], 95),
      ];

      const result = resolveExtraction(fields, []);

      expect(result.decision).toBe("INVALID");
      expect(result.fields[0].effectiveConfidence).toBeNull();
    });

    it("returns ACCEPT with the threshold value 90 exactly", () => {
      // ai=90, source=100 → effective=90 → ACCEPT (boundary inclusive).
      const fields = [makeField("subject", "Foo", ["c1"], 90)];
      const chunks = [makeChunk("c1", 100)];

      const result = resolveExtraction(fields, chunks);

      expect(result.decision).toBe("ACCEPT");
    });

    it("returns REVIEW at threshold boundary 89", () => {
      // ai=89, source=100 → effective=89 → REVIEW.
      const fields = [makeField("subject", "Foo", ["c1"], 89)];
      const chunks = [makeChunk("c1", 100)];

      const result = resolveExtraction(fields, chunks);

      expect(result.decision).toBe("REVIEW");
    });

    it("preserves all resolved fields in the output", () => {
      const fields = [
        makeField("subject", "Foo", ["c1"], 95),
        makeField("from", "Bar", ["c1"], 95),
      ];
      const chunks = [makeChunk("c1", 95)];

      const result = resolveExtraction(fields, chunks);

      expect(result.fields).toHaveLength(2);
      expect(result.fields.map((f) => f.field)).toEqual(["subject", "from"]);
    });

    it("passes chunkIds through on every field", () => {
      const fields = [makeField("subject", "Foo", ["c1", "c2"], 95)];
      const chunks = [makeChunk("c1", 95), makeChunk("c2", 90)];

      const result = resolveExtraction(fields, chunks);

      expect(result.fields[0].chunkIds).toEqual(["c1", "c2"]);
    });
  });
});
