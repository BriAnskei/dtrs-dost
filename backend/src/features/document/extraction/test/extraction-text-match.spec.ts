/**
 * Unit tests for `valueInDocument` — the backend's anti-hallucination text matcher.
 *
 * THE FUNCTION UNDER TEST (extraction-text-match.ts):
 *
 *   valueInDocument(value: string, text: string): boolean
 *
 * Returns `true` when the LLM-extracted `value` is genuinely backed by the
 * source document text. Because the backend only receives raw chunk text
 * (no word-level tokens, no coordinates), the matcher tolerates two real-
 * world artefacts:
 *
 *   1. OCR character slips — e.g. "Provirjcial" vs "Provincial".
 *   2. Cross-chunk word gaps — when an LLM reconstructs a multi-line value
 *      from several chunks it often omits the connecting words (a date label
 *      sitting between two name lines). A strict substring test would
 *      false-positive that as a hallucination.
 *
 * ALGORITHM OVERVIEW:
 *   - Fast path: normalize both strings (lowercase, NFKC, alphanumeric words
 *     joined by single spaces) and test for an exact substring match. This
 *     covers clean native text and verbatim values.
 *   - Fuzzy path: walk the document words as a subsequence of the value
 *     words. Each value word must match a document word (exact, or within
 *     ~25 % Levenshtein for words of 4+ chars). At least 80 % of the value
 *     words must match *in order* to pass.
 *
 * The 80 % threshold and the 75 % Levenshtein similarity gate are design
 * constants that this suite pins to guard against drift.
 */

import { valueInDocument } from "../extraction-text-match";

describe("valueInDocument", () => {
  /* ── Fast path: normalized exact substring ────────────────────────────── */

  describe("exact / normalized substring match (fast path)", () => {
    it("returns true for an exact verbatim match", () => {
      expect(valueInDocument("Subject: Foo", "Subject: Foo")).toBe(true);
    });

    it("returns true when value is a substring of a larger text", () => {
      expect(valueInDocument("Foo", "line one\nSubject: Foo\nline three")).toBe(true);
    });

    it("is case-insensitive (fast path)", () => {
      expect(valueInDocument("FOO", "Subject: foo")).toBe(true);
    });

    it("is NFKC-normalized so composed/decomposed chars match", () => {
      // "é" as a single composed char vs "e" + combining acute (decomposed).
      expect(valueInDocument("café", "café")).toBe(true);
    });

    it("strips punctuation / whitespace differences (fast path)", () => {
      // "2026-10-03" vs "2026 10 03" — after tokenizing, both are "2026 10 03".
      expect(valueInDocument("2026-10-03", "2026 10 03")).toBe(true);
    });
  });

  /* ── Fuzziness: OCR character slips ─────────────────────────────────── */

  describe("OCR noise tolerance (fuzzy path)", () => {
    it("matches a single word with a 1-char OCR slip when >= 75 % similarity", () => {
      // "Provincial" (10 chars) vs "Provirjcial" — levenshtein = 1 → 90 % similarity.
      expect(valueInDocument("Provincial", "Provirjcial Trading Co.")).toBe(true);
    });

    it("does NOT match when edit distance exceeds the 25 % similarity gate", () => {
      // "Subject" (7) vs "Xvjectf" — levenshtein = 4 → 43 % similarity → below 75 %.
      expect(valueInDocument("Subject", "Xvjectf")).toBe(false);
    });

    it("requires exact match for short words (< 4 chars) — no fuzzy tolerance", () => {
      // 3-letter words: no levenshtein-based fuzzy matching.
      expect(valueInDocument("foo", "fop")).toBe(false);
      expect(valueInDocument("foo", "foo")).toBe(true);
    });

    it("still matches exact short words embedded in noise text", () => {
      expect(valueInDocument("to", "To: recipient@example.com")).toBe(true);
    });
  });

  /* ── Cross-chunk gaps: subsequence matching ──────────────────────────── */

  describe("word-order / subsequence matching", () => {
    it("returns true when value words appear non-contiguously in order", () => {
      // The value "John Doe" spans two chunks with a date label between them.
      expect(valueInDocument("John Doe", "John 10/03/2026 Doe")).toBe(true);
    });

    it("returns true when value words span multiple line breaks", () => {
      expect(valueInDocument("Jane Smith", "Jane\n\nsome unrelated line\nSmith")).toBe(
        true,
      );
    });

    it("returns false when value words appear out of order", () => {
      // "Doe John" — document has "John ... Doe", order mismatch.
      expect(valueInDocument("Doe John", "John Doe")).toBe(false);
    });

    it("returns false when a word is simply missing", () => {
      expect(valueInDocument("John Doe Smith", "John Doe")).toBe(false);
    });
  });

  /* ── Threshold boundary ──────────────────────────────────────────────── */

  describe("80 % coverage threshold boundary", () => {
    it("returns true at exactly 80 % coverage (4 of 5 words match in order)", () => {
      // Value has 5 words; 4 match in order, 1 is absent.
      // 4/5 = 0.80 >= 0.80 → true.
      expect(
        valueInDocument("alpha bravo charlie delta echo", "alpha bravo charlie delta"),
      ).toBe(true);
    });

    it("returns false just below the threshold (3 of 5 words match)", () => {
      // 3/5 = 0.60 < 0.80 → false.
      expect(
        valueInDocument("alpha bravo charlie delta echo", "alpha bravo charlie"),
      ).toBe(false);
    });

    it("returns true when all words match (100 % coverage)", () => {
      expect(valueInDocument("alpha bravo charlie", "alpha bravo charlie")).toBe(true);
    });
  });

  /* ── Edge cases ──────────────────────────────────────────────────────── */

  describe("edge cases", () => {
    it("returns false for an empty value", () => {
      expect(valueInDocument("", "some text")).toBe(false);
    });

    it("returns false when the document text is empty", () => {
      expect(valueInDocument("something", "")).toBe(false);
    });

    it("returns false for whitespace-only value", () => {
      expect(valueInDocument("   ", "some text")).toBe(false);
    });

    it("returns false for whitespace-only text", () => {
      expect(valueInDocument("something", "   ")).toBe(false);
    });

    it("returns false for a value with only punctuation", () => {
      expect(valueInDocument("---", "some text")).toBe(false);
    });

    it("handles a single-word value", () => {
      // "Foobar" is a single token; "foo-bar" splits into "foo" and "bar",
      // so they don't match as a single word.
      expect(valueInDocument("Foobar", "Foobar is here")).toBe(true);
    });

    it("returns true when value has trailing punctuation not in text", () => {
      expect(valueInDocument("Foo.", "Subject: Foo")).toBe(true);
    });
  });

  /* ── Realistic document scenarios ──────────────────────────────────── */

  describe("realistic document scenarios", () => {
    it("matches a date spanning two OCR lines", () => {
      const text = "Received: 10/\n03/2026";
      expect(valueInDocument("10/03/2026", text)).toBe(true);
    });

    it("matches a multi-word subject split across chunks", () => {
      const text = "Subject: Request for\nProject Inspection";
      expect(valueInDocument("Request for Project Inspection", text)).toBe(true);
    });

    it("rejects a hallucinated value not present anywhere", () => {
      const text = "Subject: Request for Project Inspection";
      expect(valueInDocument("Subject: Budget Allocation Bill", text)).toBe(false);
    });

    it("matches a value that only exists as a fuzzy OCR slip", () => {
      const text = "Republic of the Phlppines";
      expect(valueInDocument("Republic of the Philippines", text)).toBe(true);
    });
  });
});
