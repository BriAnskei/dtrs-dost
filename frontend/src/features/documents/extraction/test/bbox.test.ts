/**
 * Unit tests for `mergeBoxes` (frontend/src/features/documents/extraction/pdf/bbox.ts).
 *
 * THE FUNCTION UNDER TEST:
 *
 *   mergeBoxes(boxes: BoundingBox[]): BoundingBox
 *
 * Computes the axis-aligned bounding box that encloses all input boxes.
 * Used throughout the PDF extraction pipeline to combine per-word boxes
 * into a per-line / per-chunk box.
 */

import { describe, expect, it } from "vitest";
import type { BoundingBox } from "../pdf/types";
import { mergeBoxes } from "../pdf/bbox";

function box(x: number, y: number, width: number, height: number): BoundingBox {
  return { x, y, width, height };
}

describe("mergeBoxes", () => {
  it("returns the same box when given a single box", () => {
    const b = box(10, 20, 30, 40);
    expect(mergeBoxes([b])).toEqual(b);
  });

  it("encloses two disjoint boxes", () => {
    const a = box(0, 0, 10, 10); // x:[0,10] y:[0,10]
    const b = box(20, 25, 15, 5); // x:[20,35] y:[25,30]

    const result = mergeBoxes([a, b]);

    expect(result).toEqual({
      x: 0, // min(0, 20)
      y: 0, // min(0, 25)
      width: 35, // 35 - 0
      height: 30, // 30 - 0
    });
  });

  it("handles overlapping boxes (shared area counted once via union)", () => {
    const a = box(0, 0, 10, 10); // x:[0,10] y:[0,10]
    const b = box(5, 5, 10, 10); // x:[5,15] y:[5,15]

    const result = mergeBoxes([a, b]);

    expect(result).toEqual({
      x: 0,
      y: 0,
      width: 15, // 15 - 0
      height: 15, // 15 - 0
    });
  });

  it("handles negative coordinates", () => {
    const a = box(-10, -5, 20, 10); // x:[-10,10] y:[-5,5]
    const b = box(0, 0, 5, 5); // x:[0,5] y:[0,5]

    const result = mergeBoxes([a, b]);

    expect(result).toEqual({
      x: -10,
      y: -5,
      width: 20, // 10 - (-10)
      height: 10, // 5 - (-5)
    });
  });

  it("handles three or more boxes", () => {
    const boxes = [
      box(1, 1, 2, 2), // x:[1,3] y:[1,3]
      box(10, 5, 3, 4), // x:[10,13] y:[5,9]
      box(2, 8, 1, 1), // x:[2,3] y:[8,9]
    ];

    const result = mergeBoxes(boxes);

    expect(result).toEqual({
      x: 1, // leftmost edge
      y: 1, // topmost edge
      width: 12, // 13 - 1
      height: 8, // 9 - 1
    });
  });

  it("produces zero-area box when all inputs are points (zero width/height)", () => {
    const a = box(5, 5, 0, 0);
    const b = box(5, 5, 0, 0);

    const result = mergeBoxes([a, b]);

    expect(result).toEqual({ x: 5, y: 5, width: 0, height: 0 });
  });

  it("handles a mix of zero-width and positive-width boxes", () => {
    const a = box(0, 0, 0, 10); // vertical line
    const b = box(5, 0, 5, 0); // horizontal line

    const result = mergeBoxes([a, b]);

    expect(result.x).toBe(0); // min(0, 5)
    expect(result.y).toBe(0); // min(0, 0)
    expect(result.width).toBe(10); // 10 - 0
    expect(result.height).toBe(10); // 10 - 0
  });
});
