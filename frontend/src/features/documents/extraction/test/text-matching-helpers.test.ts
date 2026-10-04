/**
 * Unit tests for `findValueBox` (text-matching-helpers.ts).
 *
 * THE FUNCTION UNDER TEST:
 *
 *   findValueBox(value: string, tokens: ExtractionToken[]): BoundingBox | null
 *
 * Given the LLM-returned value and the word-level tokens from a single chunk,
 * returns the smallest bounding box covering the longest *consecutive* run of
 * matching words, or `null` when no convincing match is found.
 *
 * KEY BEHAVIOUR:
 *   - Words are tokenized (lowercase, NFKC, alphanumeric, non-Latin-safe).
 *   - A token like "10/03/2026" expands to 3 word-pieces that all point back
 *     to the same token's bbox.
 *   - Matching uses the same OCR-tolerance rule as the backend's `sameWord`:
 *     exact match, or within ~25 % Levenshtein for words of 4+ chars.
 *   - A lone shared short word (e.g. "of") is ignored unless the value is a
 *     single word.
 *   - On a hit, the bboxes of all matched tokens are merged via `mergeBoxes`.
 */

import { describe, expect, it } from "vitest";
import type { BoundingBox, ExtractionToken } from "../pdf/types";
import { findValueBox } from "../helpers/text-matching-helpers";

function token(text: string, bbox: BoundingBox): ExtractionToken {
  return { text, bbox, confidence: 1.0 };
}

function bbox(x = 0, y = 0, width = 1, height = 1): BoundingBox {
  return { x, y, width, height };
}

describe("findValueBox", () => {
  /* ── Basic exact match ───────────────────────────────────────────── */

  describe("exact single-word match", () => {
    it("returns the token's bbox for an exact single-word match", () => {
      const tokens = [
        token("Hello", bbox(10, 20, 5, 3)),
        token("World", bbox(20, 20, 5, 3)),
      ];

      expect(findValueBox("Hello", tokens)).toEqual(bbox(10, 20, 5, 3));
    });

    it("finds the match even when not the first token", () => {
      const tokens = [
        token("Start", bbox(0, 0, 4, 2)),
        token("Target", bbox(10, 0, 6, 2)),
      ];

      expect(findValueBox("Target", tokens)).toEqual(bbox(10, 0, 6, 2));
    });
  });

  /* ── Multi-word / multi-token values ─────────────────────────────── */

  describe("multi-token values", () => {
    it("expands a token like '10/03/2026' into word pieces but returns the merged token bbox", () => {
      const tokens = [token("10/03/2026", bbox(0, 0, 20, 5))];

      const result = findValueBox("10/03/2026", tokens);

      // All three word-pieces point back to token 0, so mergeBoxes gives token 0's bbox.
      expect(result).toEqual(bbox(0, 0, 20, 5));
    });

    it("returns true for a date value spanning two tokens", () => {
      const tokens = [
        token("Received", bbox(0, 0, 10, 2)),
        token("10/03/2026", bbox(15, 0, 20, 5)),
        token("Filed", bbox(40, 0, 8, 2)),
      ];

      const result = findValueBox("10/03/2026", tokens);

      // "10/03/2026" has 3 word-pieces, all in token index 1.
      expect(result).toEqual(bbox(15, 0, 20, 5));
    });
  });

  /* ── Consecutive-word runs ───────────────────────────────────────── */

  describe("consecutive word runs", () => {
    it("merges bboxes of consecutive matching tokens (longest run)", () => {
      const tokens = [
        token("The", bbox(0, 0, 5, 2)), // 0
        token("quick", bbox(10, 0, 8, 2)), // 1
        token("brown", bbox(20, 0, 8, 2)), // 2
        token("fox", bbox(30, 0, 5, 2)), // 3
        token("jumps", bbox(40, 0, 8, 2)), // 4
        token("over", bbox(55, 0, 6, 2)), // 5
      ];

      // "quick brown fox" → tokens 1,2,3
      const result = findValueBox("quick brown fox", tokens);

      // Merged bbox: x min 10, y 0, width = (30+5) - 10 = 25, height 2
      expect(result).toEqual(bbox(10, 0, 25, 2));
    });

    it("returns the longest consecutive run, not a shorter one", () => {
      const tokens = [
        token("alpha", bbox(0, 0, 5, 2)), // 0
        token("beta", bbox(10, 0, 4, 2)), // 1
        token("gamma", bbox(20, 0, 5, 2)), // 2
        token("delta", bbox(30, 0, 5, 2)), // 3
      ];

      // "beta gamma" is a run of 2; "alpha" alone is a run of 1.
      const result = findValueBox("beta gamma", tokens);

      expect(result).toEqual(bbox(10, 0, 15, 2)); // covers tokens 1 and 2
    });

    it("finds a match that starts after a non-matching prefix", () => {
      const tokens = [
        token("unrelated", bbox(0, 0, 10, 2)),
        token("match", bbox(15, 0, 5, 2)),
      ];

      expect(findValueBox("match", tokens)).toEqual(bbox(15, 0, 5, 2));
    });
  });

  /* ── Fuzzy matching (OCR slips) ──────────────────────────────────── */

  describe("fuzzy matching", () => {
    it("matches a token with an OCR slip (1-char edit, >= 75 % similarity)", () => {
      // "Provincial" (10 chars) vs "Provirjcial" — levenshtein 1 → 90 %.
      const tokens = [token("Provirjcial", bbox(0, 0, 10, 2))];

      expect(findValueBox("Provincial", tokens)).toEqual(bbox(0, 0, 10, 2));
    });

    it("does NOT fuzzy-match words shorter than 4 chars", () => {
      // "cat" (3 chars) vs "cot" — too short for fuzzy, must be exact.
      const tokens = [token("cot", bbox(0, 0, 3, 2))];

      expect(findValueBox("cat", tokens)).toBeNull();
    });

    it("still matches exact short words", () => {
      const tokens = [token("to", bbox(0, 0, 2, 2))];
      expect(findValueBox("to", tokens)).toEqual(bbox(0, 0, 2, 2));
    });

    it("does NOT match when edit distance exceeds the threshold", () => {
      // "Subject" (7) vs "Xvjectf" — levenshtein 4 → 43 % similarity.
      const tokens = [token("Xvjectf", bbox(0, 0, 10, 2))];

      expect(findValueBox("Subject", tokens)).toBeNull();
    });
  });

  /* ── Negative cases ──────────────────────────────────────────────── */

  describe("no match returns null", () => {
    it("returns null when no tokens match any value word", () => {
      const tokens = [
        token("completely", bbox(0, 0, 10, 2)),
        token("unrelated", bbox(15, 0, 8, 2)),
      ];

      expect(findValueBox("Subject", tokens)).toBeNull();
    });

    it("returns null when tokens array is empty", () => {
      expect(findValueBox("anything", [])).toBeNull();
    });

    it("returns null when value is empty", () => {
      const tokens = [token("something", bbox(0, 0, 5, 2))];

      expect(findValueBox("", tokens)).toBeNull();
    });

    it("ignores a lone shared word like 'of' unless value is a single word", () => {
      // Value "of the" — only "of" appears in tokens; too short a run.
      const tokens = [
        token("of", bbox(0, 0, 2, 2)),
        token("something", bbox(10, 0, 10, 2)),
      ];

      expect(findValueBox("of the", tokens)).toBeNull();
    });

    it("matches a single-word 'of' when value IS just 'of'", () => {
      const tokens = [token("of", bbox(0, 0, 2, 2))];

      // When the value is a single word, even a short word is accepted.
      expect(findValueBox("of", tokens)).toEqual(bbox(0, 0, 2, 2));
    });

    it("returns null when only one out of many value words matches", () => {
      const tokens = [token("Subject", bbox(0, 0, 10, 2))];
      // "Subject from to dateReceived summary" — only "Subject" matches.
      expect(findValueBox("Subject from to dateReceived summary", tokens)).toBeNull();
    });
  });

  /* ── Normalization ───────────────────────────────────────────────── */

  describe("normalization", () => {
    it("is case-insensitive", () => {
      const tokens = [token("SUBJECT", bbox(0, 0, 10, 2))];
      expect(findValueBox("subject", tokens)).toEqual(bbox(0, 0, 10, 2));
    });

    it("handles NFKC normalization", () => {
      const tokens = [token("café", bbox(0, 0, 5, 2))];
      expect(findValueBox("café", tokens)).toEqual(bbox(0, 0, 5, 2));
    });

    it("strips punctuation when matching", () => {
      // "10/03/2026" expands to words "10", "03", "2026".
      const tokens = [token("10", bbox(0, 0, 3, 2)), token("03", bbox(5, 0, 3, 2)), token("2026", bbox(10, 0, 8, 2))];

      expect(findValueBox("10/03/2026", tokens)).toEqual(bbox(0, 0, 18, 2));
    });
  });
});
