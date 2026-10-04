/**
 * Unit tests for extraction-helpers (frontend/src/features/documents/extraction/helpers/extraction-helpers.ts).
 *
 * PURE FUNCTIONS UNDER TEST:
 *
 *   computeEffective(ai: number, source: number): number
 *     - effective = round(ai * source / 100). Both inputs are 0-100.
 *
 *   decide(rows: ResultRow[]): { decision, minEffective }
 *     - INVALID: any row has value=null or effectiveConfidence=null.
 *     - ACCEPT:  min effectiveConfidence >= ACCEPT_THRESHOLD (90).
 *     - REVIEW:  min effectiveConfidence < ACCEPT_THRESHOLD (90).
 *
 *   confidenceTone(v: number | null): string
 *     - null        → gray (neutral)
 *     - >= 90       → success (green)
 *     - <  90       → warning (amber)
 *
 *   formatBytes(b: number): string
 *     - < 1 MB → "N KB"
 *     - >= 1 MB → "N.N MB"
 *
 *   isFlagged(r: ResultRow): boolean
 *     - true if effectiveConfidence is null OR < ACCEPT_THRESHOLD.
 */

import { describe, expect, it } from "vitest";
import {
  computeEffective,
  decide,
  confidenceTone,
  formatBytes,
  isFlagged,
} from "../helpers/extraction-helpers";
import { ACCEPT_THRESHOLD } from "../constans";
import type { ResultRow } from "../types/extraction-types";

/* ── computeEffective ──────────────────────────────────────────────── */

describe("computeEffective", () => {
  it("multiplies ai × source / 100", () => {
    expect(computeEffective(80, 90)).toBe(72); // 80 * 90 / 100 = 72
  });

  it("rounds to the nearest integer", () => {
    expect(computeEffective(99, 99)).toBe(98); // 98.01 → 98
  });

  it("returns 0 when ai is 0", () => {
    expect(computeEffective(0, 100)).toBe(0);
  });

  it("returns 0 when source is 0", () => {
    expect(computeEffective(100, 0)).toBe(0);
  });

  it("returns 100 when both are 100", () => {
    expect(computeEffective(100, 100)).toBe(100);
  });

  it("returns 1 when both are 1", () => {
    expect(computeEffective(1, 1)).toBe(0); // 0.01 rounds to 0
  });
});

/* ── decide ────────────────────────────────────────────────────────── */

describe("decide", () => {
  /** Helper: build a ResultRow with all fields set. */
  function row(overrides: Partial<ResultRow>): ResultRow {
    return {
      field: "subject",
      value: "test",
      page: 1,
      chunkIds: ["p1-o1"],
      highlights: [],
      aiConfidence: 90,
      sourceConfidence: 100,
      effectiveConfidence: 90,
      ...overrides,
    };
  }

  it("returns INVALID when any row has value === null", () => {
    const rows = [
      row({ field: "subject" }),
      row({ field: "from", value: null, aiConfidence: null, effectiveConfidence: null }),
    ];

    const result = decide(rows);

    expect(result.decision).toBe("INVALID");
    expect(result.minEffective).toBeNull();
  });

  it("returns INVALID when any row has effectiveConfidence === null", () => {
    const rows = [
      row({ field: "subject" }),
      row({ field: "from", effectiveConfidence: null }),
    ];

    const result = decide(rows);

    expect(result.decision).toBe("INVALID");
    expect(result.minEffective).toBeNull();
  });

  it("returns ACCEPT when all rows meet the threshold", () => {
    const rows = [
      row({ field: "subject", effectiveConfidence: 95 }),
      row({ field: "from", effectiveConfidence: 90 }),
    ];

    const result = decide(rows);

    expect(result.decision).toBe("ACCEPT");
    expect(result.minEffective).toBe(90);
  });

  it("returns REVIEW when any row is below ACCEPT_THRESHOLD", () => {
    const rows = [
      row({ field: "subject", effectiveConfidence: 95 }),
      row({ field: "from", effectiveConfidence: 89 }),
    ];

    const result = decide(rows);

    expect(result.decision).toBe("REVIEW");
    expect(result.minEffective).toBe(89);
  });

  it("returns REVIEW at exactly ACCEPT_THRESHOLD - 1 (boundary)", () => {
    const rows = [row({ field: "subject", effectiveConfidence: ACCEPT_THRESHOLD - 1 })];

    expect(decide(rows).decision).toBe("REVIEW");
  });

  it("returns ACCEPT at exactly ACCEPT_THRESHOLD (boundary)", () => {
    const rows = [row({ field: "subject", effectiveConfidence: ACCEPT_THRESHOLD })];

    expect(decide(rows).decision).toBe("ACCEPT");
  });

  it("returns ACCEPT for an empty rows array (no fields to fail → vacuously passes)", () => {
    /*
     * decide([]) hits no INVALID branch (some() on empty returns false) and
     * Math.min(...[]) === Infinity, which is >= ACCEPT_THRESHOLD → ACCEPT.
     * This pins that edge-case behavior so a future guard clause for empty
     * input would be caught as a behavior change.
     */
    const result = decide([]);

    expect(result.decision).toBe("ACCEPT");
    expect(result.minEffective).toBe(Infinity);
  });

  it("uses the minimum effectiveConfidence across all rows (all values present)", () => {
    /*
     * When every row has a non-null value and non-null confidence, the
     * decision is REVIEW (25 < 90) — NOT INVALID. INVALID only fires when a
     * value or confidence is literally null.
     */
    const rows = [
      row({ field: "subject", effectiveConfidence: 50 }),
      row({ field: "from", effectiveConfidence: 75 }),
      row({ field: "to", effectiveConfidence: 25 }),
    ];

    const result = decide(rows);

    expect(result.minEffective).toBe(25);
    expect(result.decision).toBe("REVIEW");
  });
});

/* ── confidenceTone ────────────────────────────────────────────────── */

describe("confidenceTone", () => {
  it("returns a gray tone for null confidence", () => {
    expect(confidenceTone(null)).toBe("text-gray-400 dark:text-gray-500");
  });

  it("returns success tone for confidence >= ACCEPT_THRESHOLD", () => {
    expect(confidenceTone(90)).toBe("text-success-600 dark:text-success-400");
    expect(confidenceTone(100)).toBe("text-success-600 dark:text-success-400");
  });

  it("returns warning tone for confidence < ACCEPT_THRESHOLD", () => {
    expect(confidenceTone(89)).toBe("text-warning-600 dark:text-warning-400");
    expect(confidenceTone(0)).toBe("text-warning-600 dark:text-warning-400");
  });
});

/* ── formatBytes ───────────────────────────────────────────────────── */

describe("formatBytes", () => {
  it("formats bytes under 1 MB as KB", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(512_000)).toBe("500 KB");
  });

  it("formats bytes at exactly 1 MB boundary as MB", () => {
    // 1024 * 1024 = 1,048,576
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats bytes above 1 MB as MB with one decimal", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("handles 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 KB");
  });
});

/* ── isFlagged ─────────────────────────────────────────────────────── */

describe("isFlagged", () => {
  function row(overrides: Partial<ResultRow>): ResultRow {
    return {
      field: "subject",
      value: "test",
      page: 1,
      chunkIds: ["p1-o1"],
      highlights: [],
      aiConfidence: 90,
      sourceConfidence: 100,
      effectiveConfidence: 90,
      ...overrides,
    };
  }

  it("returns true when effectiveConfidence is null", () => {
    expect(isFlagged(row({ effectiveConfidence: null }))).toBe(true);
  });

  it("returns true when effectiveConfidence is below ACCEPT_THRESHOLD", () => {
    expect(isFlagged(row({ effectiveConfidence: 89 }))).toBe(true);
  });

  it("returns false when effectiveConfidence meets ACCEPT_THRESHOLD", () => {
    expect(isFlagged(row({ effectiveConfidence: ACCEPT_THRESHOLD }))).toBe(false);
  });

  it("returns false when effectiveConfidence is above ACCEPT_THRESHOLD", () => {
    expect(isFlagged(row({ effectiveConfidence: 100 }))).toBe(false);
  });
});
