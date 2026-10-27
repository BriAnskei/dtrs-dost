/**
 * Unit tests for `useReviewSelection` — the hook managing which field row
 * is selected in the review step and navigation (keyboard arrows + "next flagged").
 *
 * THE HOOK (hooks/use-review-selection.ts):
 *
 *   useReviewSelection(rows: ResultRow[])
 *     → { selected, select, move, nextFlagged, flaggedCount }
 *
 * Rules:
 *   - flagged = rows.filter(isFlagged) — fields with null or below-threshold confidence.
 *   - Initial selected: first flagged field's field key, else first row's field, else null.
 *   - move(delta): cycles through rows (wraps around) by ±1.
 *     No-op if rows is empty.
 *   - nextFlagged(): cycles to the next flagged field (wraps around).
 *     No-op if there are no flagged fields.
 *   - flaggedCount: number of flagged rows.
 *
 * Tests use @testing-library/react's renderHook (available via the react package
 * in the test environment). Since we're in happy-dom + vitest globals mode,
 * we can use renderHook from @testing-library/react.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useReviewSelection } from "../admins/hooks/use-review-selection";
import type { ResultRow } from "../types/extraction-types";

/** Build a ResultRow with sensible defaults. */
function row(
  field: string,
  overrides: Partial<ResultRow> = {},
): ResultRow {
  return {
    field: field as ResultRow["field"],
    value: "test",
    page: 1,
    chunkIds: [],
    highlights: [],
    aiConfidence: 95,
    sourceConfidence: 100,
    effectiveConfidence: 95,
    ...overrides,
  };
}

describe("useReviewSelection", () => {
  describe("initial selected", () => {
    it("starts with the first flagged field when there are flagged rows", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: 95 }),
        row("from", { effectiveConfidence: 50 }), // flagged
        row("to", { effectiveConfidence: 95 }),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.selected).toBe("from");
    });

    it("starts with the first row when no fields are flagged", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: 95 }),
        row("from", { effectiveConfidence: 95 }),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.selected).toBe("subject");
    });

    it("starts with null when rows is empty", () => {
      const { result } = renderHook(() => useReviewSelection([]));

      expect(result.current.selected).toBeNull();
    });

    it("starts with the first flagged field even if it is not the first row", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: 95 }),
        row("from", { effectiveConfidence: 95 }),
        row("to", { effectiveConfidence: 40 }), // flagged, not first
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.selected).toBe("to");
    });

    it("starts with null effectiveConfidence counted as flagged", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: null }), // flagged
        row("from", { effectiveConfidence: 95 }),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.selected).toBe("subject");
    });
  });

  describe("move", () => {
    it("moves forward by one row", () => {
      const rows: ResultRow[] = [
        row("subject"),
        row("from"),
        row("to"),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.selected).toBe("subject");

      act(() => result.current.move(1));

      expect(result.current.selected).toBe("from");
    });

    it("moves backward by one row", () => {
      const rows: ResultRow[] = [
        row("subject"),
        row("from"),
        row("to"),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      act(() => result.current.select("to"));
      act(() => result.current.move(-1));

      expect(result.current.selected).toBe("from");
    });

    it("wraps around from the last row to the first on forward move", () => {
      const rows: ResultRow[] = [
        row("subject"),
        row("from"),
        row("to"),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      act(() => result.current.select("to"));
      act(() => result.current.move(1));

      expect(result.current.selected).toBe("subject");
    });

    it("wraps around from the first row to the last on backward move", () => {
      const rows: ResultRow[] = [
        row("subject"),
        row("from"),
        row("to"),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      act(() => result.current.move(-1));

      expect(result.current.selected).toBe("to");
    });

    it("is a no-op when rows is empty", () => {
      const { result } = renderHook(() => useReviewSelection([]));

      act(() => result.current.move(1));

      expect(result.current.selected).toBeNull();
    });
  });

  describe("select", () => {
    it("sets selected to the given field key", () => {
      const rows: ResultRow[] = [
        row("subject"),
        row("from"),
        row("to"),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      act(() => result.current.select("to"));

      expect(result.current.selected).toBe("to");
    });

    it("sets selected to null", () => {
      const rows: ResultRow[] = [row("subject")];

      const { result } = renderHook(() => useReviewSelection(rows));

      act(() => result.current.select(null));

      expect(result.current.selected).toBeNull();
    });
  });

  describe("nextFlagged", () => {
    it("moves to the next flagged field forward", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: 95 }),
        row("from", { effectiveConfidence: 50 }), // flagged (index 1)
        row("to", { effectiveConfidence: 95 }),
        row("summary", { effectiveConfidence: 40 }), // flagged (index 3)
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      // Initially selected = "from" (first flagged).
      expect(result.current.selected).toBe("from");

      act(() => result.current.nextFlagged());

      expect(result.current.selected).toBe("summary");
    });

    it("wraps from last flagged to first flagged", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: 50 }), // flagged (index 0)
        row("from", { effectiveConfidence: 95 }),
        row("summary", { effectiveConfidence: 40 }), // flagged (index 2)
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.selected).toBe("subject");

      act(() => result.current.select("summary"));
      act(() => result.current.nextFlagged());

      expect(result.current.selected).toBe("subject");
    });

    it("is a no-op when no fields are flagged", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: 95 }),
        row("from", { effectiveConfidence: 95 }),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      const before = result.current.selected;

      act(() => result.current.nextFlagged());

      expect(result.current.selected).toBe(before);
    });

    it("is a no-op when there are no rows (selected is already null, not flagged)", () => {
      const { result } = renderHook(() => useReviewSelection([]));

      act(() => result.current.nextFlagged());

      expect(result.current.selected).toBeNull();
    });
  });

  describe("flaggedCount", () => {
    it("returns 0 when no fields are flagged", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: 95 }),
        row("from", { effectiveConfidence: 90 }),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.flaggedCount).toBe(0);
    });

    it("returns the count of flagged fields", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: 95 }),
        row("from", { effectiveConfidence: 50 }), // flagged
        row("to", { effectiveConfidence: 40 }), // flagged
        row("summary", { effectiveConfidence: 95 }),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.flaggedCount).toBe(2);
    });

    it("counts null effectiveConfidence as flagged", () => {
      const rows: ResultRow[] = [
        row("subject", { effectiveConfidence: null }),
        row("from", { effectiveConfidence: null }),
        row("to", { effectiveConfidence: 95 }),
      ];

      const { result } = renderHook(() => useReviewSelection(rows));

      expect(result.current.flaggedCount).toBe(2);
    });
  });
});
