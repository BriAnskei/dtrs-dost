/**
 * Unit tests for `reciever-upload-confidence` — the pure helper functions
 * used by ConfidenceMeter and UploadResultCard to normalize confidence scores.
 *
 * THE HELPERS (helpers/reciever-upload-confidence.ts):
 *
 *   toPercent(value: number | null | undefined): number | null
 *     - Accepts 0-1 or 0-100 range, returns a 0-100 integer, or null.
 *     - NaN and null/undefined → null.
 *     - Clamps to [0, 100].
 *
 *   isLowConfidence(pct: number | null): boolean
 *     - True when pct is not null AND pct < CONFIDENCE_THRESHOLDS.medium (70).
 *
 *   formatPercent(pct: number | null): string
 *     - Returns "—" for null, else `${pct}%`.
 */

import { describe, expect, it } from "vitest";
import { formatPercent, isLowConfidence, toPercent } from "./reciever-upload-confidence";
import { CONFIDENCE_THRESHOLDS } from "../receiver-upload-constants";

describe("reciever-upload-confidence", () => {
  describe("toPercent", () => {
    it("returns null for null input", () => {
      expect(toPercent(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(toPercent(undefined)).toBeNull();
    });

    it("returns null for NaN input", () => {
      expect(toPercent(NaN)).toBeNull();
    });

    it("converts 0-1 range to 0-100 (e.g. 0.5 → 50)", () => {
      expect(toPercent(0.5)).toBe(50);
    });

    it("converts 0.95 → 95", () => {
      expect(toPercent(0.95)).toBe(95);
    });

    it("converts 1 → 100", () => {
      expect(toPercent(1)).toBe(100);
    });

    it("converts 0 → 0", () => {
      expect(toPercent(0)).toBe(0);
    });

    it("treats values > 1 as already in 0-100 scale", () => {
      expect(toPercent(75)).toBe(75);
      expect(toPercent(85)).toBe(85);
    });

    it("clamps values below 0 to 0", () => {
      expect(toPercent(-5)).toBe(0);
      expect(toPercent(-0.5)).toBe(0);
    });

    it("clamps values above 100 to 100", () => {
      expect(toPercent(150)).toBe(100);
      expect(toPercent(200)).toBe(100);
    });

    it("rounds to the nearest integer", () => {
      // 0.555 * 100 = 55.5 → rounds to 56
      expect(toPercent(0.555)).toBe(56);
      // 0.554 * 100 = 55.4 → rounds to 55
      expect(toPercent(0.554)).toBe(55);
      // 67.5 → rounds to 68
      expect(toPercent(67.5)).toBe(68);
    });
  });

  describe("isLowConfidence", () => {
    it("returns true for percentages below the medium threshold (70)", () => {
      expect(isLowConfidence(0)).toBe(true);
      expect(isLowConfidence(50)).toBe(true);
      expect(isLowConfidence(69)).toBe(true);
    });

    it("returns false for percentages at or above the medium threshold", () => {
      expect(isLowConfidence(70)).toBe(false);
      expect(isLowConfidence(85)).toBe(false);
      expect(isLowConfidence(100)).toBe(false);
    });

    it("returns false for null (missing scores are not flagged)", () => {
      expect(isLowConfidence(null)).toBe(false);
    });

    it("uses the CONFIDENCE_THRESHOLDS.medium value (70) as the boundary", () => {
      expect(CONFIDENCE_THRESHOLDS.medium).toBe(70);
    });
  });

  describe("formatPercent", () => {
    it("returns '—' for null input", () => {
      expect(formatPercent(null)).toBe("—");
    });

    it("returns '—' for undefined input", () => {
      expect(formatPercent(undefined)).toBe("—");
    });

    it("returns the percentage with '%' suffix for a number", () => {
      expect(formatPercent(75)).toBe("75%");
      expect(formatPercent(0)).toBe("0%");
      expect(formatPercent(100)).toBe("100%");
    });
  });
});
