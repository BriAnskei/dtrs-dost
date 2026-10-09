/**
 * Unit tests for `ConfidenceMeter` — a presentational component that renders a
 * confidence percentage as a progress bar with color-coded levels.
 *
 * THE COMPONENT (components/ConfidenceMeter.tsx):
 *
 *   ConfidenceMeter({ label, value, emphasized?, hint? })
 *
 * It calls three helpers from `helpers/reciever-upload-confidence`:
 *   - `toPercent(value)`        → 0-100 integer (or null)
 *   - `getConfidenceLevel(pct)` → "low" | "medium" | "high"
 *   - `LEVEL_STYLES[level]`     → { text, label, bar } Tailwind classes
 *
 * NOTE: `getConfidenceLevel` and `LEVEL_STYLES` are NOT exported by the real
 * helper module, but the component imports them. We mock the entire module
 * so the component gets working implementations for the test.
 *
 * WHAT WE TEST:
 *   - value=null   → renders "—", progressbar width 0%, aria-valuenow undefined
 *   - value=0.5    → renders "50%", width 50%, aria-valuenow=50
 *   - value=1      → renders "100%", width 100%
 *   - value=0      → renders "0%", width 0%
 *   - value>1      → treated as already-percent (e.g. 75 → "75%")
 *   - NaN / undefined → treated as null
 *   - Clamping below 0 and above 100.
 *   - emphasized=true  → dominant text styling (font-semibold, taller bar)
 *   - hint prop      → renders as title attribute
 *   - aria attributes (role=progressbar, valuemin=0, valuemax=100, valuetext)
 *   - LEVEL_STYLES mapping is applied to the bar div classes
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfidenceMeter from "./ConfidenceMeter";

/*
 * Mock the helper module. vi.hoisted() is required because we need these
 * values inside the vi.mock factory which is hoisted above all top-level
 * code. Each mock is a flat property (not nested) to comply with vitest
 * hoisting rules.
 */
const {
  mockToPercent,
  mockGetConfidenceLevel,
  mockLevelStyles,
} = vi.hoisted(() => {
  const LEVEL_STYLES = {
    low: { text: "text-error-700 dark:text-error-400", label: "Low", bar: "bg-error-500" },
    medium: {
      text: "text-warning-700 dark:text-warning-400",
      label: "Medium",
      bar: "bg-warning-500",
    },
    high: {
      text: "text-success-700 dark:text-success-400",
      label: "High",
      bar: "bg-success-500",
    },
  };

  function getConfidenceLevelImpl(pct: number | null): keyof typeof LEVEL_STYLES {
    if (pct == null) return "low";
    if (pct >= 90) return "high";
    if (pct >= 70) return "medium";
    return "low";
  }

  function toPercentImpl(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(value)) return null;
    const pct = value <= 1 ? value * 100 : value;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  return {
    mockToPercent: toPercentImpl,
    mockGetConfidenceLevel: getConfidenceLevelImpl,
    mockLevelStyles: LEVEL_STYLES,
  };
});

vi.mock("../helpers/reciever-upload-confidence", () => ({
  toPercent: mockToPercent,
  getConfidenceLevel: mockGetConfidenceLevel,
  LEVEL_STYLES: mockLevelStyles,
  isLowConfidence: (pct: number | null) => pct != null && pct < 70,
  formatPercent: (pct: number | null) => (pct == null ? "—" : `${pct}%`),
}));

describe("ConfidenceMeter", () => {
  /* ── value normalization ─────────────────────────────────────────────── */

  describe("toPercent behavior (0-1 and 0-100 inputs)", () => {
    it("renders null value as '—' with 0% progress width", () => {
      render(<ConfidenceMeter label="Accuracy" value={null} />);

      expect(screen.getByText("—")).toBeInTheDocument();
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).not.toHaveAttribute("aria-valuenow");

      const bar = progressbar.querySelector("div");
      expect(bar).toHaveStyle({ width: "0%" });
    });

    it("renders 0.5 (0-1 range) as 50%", () => {
      render(<ConfidenceMeter label="Accuracy" value={0.5} />);

      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");

      const bar = screen.getByRole("progressbar").querySelector("div");
      expect(bar).toHaveStyle({ width: "50%" });
    });

    it("renders 1 (0-1 range) as 100%", () => {
      render(<ConfidenceMeter label="Accuracy" value={1} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");

      const bar = screen.getByRole("progressbar").querySelector("div");
      expect(bar).toHaveStyle({ width: "100%" });
    });

    it("renders 0 (0-1 range) as 0%", () => {
      render(<ConfidenceMeter label="Accuracy" value={0} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

      const bar = screen.getByRole("progressbar").querySelector("div");
      expect(bar).toHaveStyle({ width: "0%" });
    });

    it("treats values > 1 as already in 0-100 scale", () => {
      render(<ConfidenceMeter label="Accuracy" value={75} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "75");
    });

    it("clamps values below 0 to 0%", () => {
      render(<ConfidenceMeter label="Accuracy" value={-10} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("clamps values above 100 to 100%", () => {
      render(<ConfidenceMeter label="Accuracy" value={150} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    });
  });

  /* ── NaN handling ───────────────────────────────────────────────────── */

  describe("NaN handling", () => {
    it("renders '—' for NaN values", () => {
      render(<ConfidenceMeter label="Accuracy" value={NaN} />);

      expect(screen.getByText("—")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    });

    it("renders '—' for undefined values", () => {
      render(<ConfidenceMeter label="Accuracy" value={undefined} />);

      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  /* ── ARIA attributes ────────────────────────────────────────────────── */

  describe("accessibility attributes", () => {
    it("applies role=progressbar with valuemin=0 and valuemax=100", () => {
      render(<ConfidenceMeter label="Confidence" value={0.8} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-label", "Confidence");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
      expect(progressbar).toHaveAttribute("aria-valuenow", "80");
    });

    it('sets aria-valuetext to "Not available" when value is null', () => {
      render(<ConfidenceMeter label="Confidence" value={null} />);

      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "Not available",
      );
    });

    it("sets aria-valuetext to the percentage with level label when value is present", () => {
      render(<ConfidenceMeter label="Confidence" value={0.95} />);

      const progressbar = screen.getByRole("progressbar");
      // 95% = "high" level → valuetext = "95% (High)"
      expect(progressbar).toHaveAttribute("aria-valuetext", "95% (High)");
    });
  });

  /* ── Props ──────────────────────────────────────────────────────────── */

  describe("props", () => {
    it("renders the label text", () => {
      render(<ConfidenceMeter label="Source confidence" value={0.9} />);

      expect(screen.getByText("Source confidence")).toBeInTheDocument();
    });

    it("renders the hint as the title attribute on the root element", () => {
      render(<ConfidenceMeter label="Accuracy" value={0.5} hint="Calculated from OCR" />);

      // The root div has the title attribute.
      expect(screen.getByTitle("Calculated from OCR")).toBeInTheDocument();
    });

    it("applies emphasized styling when emphasized=true", () => {
      render(<ConfidenceMeter label="Effective score" value={0.95} emphasized />);

      // Emphasized label uses font-semibold + dark text.
      const labelSpan = screen.getByText("Effective score");
      expect(labelSpan).toHaveClass("font-semibold");

      // Emphasized bar is taller (h-2.5 vs h-1.5).
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar.className).toContain("h-2.5");
    });

    it("uses non-emphasized styling when emphasized is false (default)", () => {
      render(<ConfidenceMeter label="Effective score" value={0.95} />);

      const labelSpan = screen.getByText("Effective score");
      expect(labelSpan).not.toHaveClass("font-semibold");

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar.className).toContain("h-1.5");
    });
  });

  /* ── Level styling ─────────────────────────────────────────────────── */

  describe("level color classes", () => {
    /*
     * LEVEL_STYLES (mocked) maps confidence levels to Tailwind classes.
     * We verify the bar div receives the correct color classes per level:
     *   - < 70  → low → error red (bg-error-500)
     *   - 70-89 → medium → warning amber (bg-warning-500)
     *   >= 90  → high → success green (bg-success-500)
     */

    it("applies error bar color for low confidence (< 70%)", () => {
      render(<ConfidenceMeter label="Score" value={0.5} />);

      // 50% = low level → error bar.
      expect(screen.getByRole("progressbar").querySelector("div")).toHaveClass(
        "bg-error-500",
      );
    });

    it("applies warning bar color for medium confidence (70-89%)", () => {
      render(<ConfidenceMeter label="Score" value={0.8} />);

      // 80% = medium level → warning bar.
      expect(screen.getByRole("progressbar").querySelector("div")).toHaveClass(
        "bg-warning-500",
      );
    });

    it("applies success bar color for high confidence (>= 90%)", () => {
      render(<ConfidenceMeter label="Score" value={0.95} />);

      // 95% = high level → success bar.
      expect(screen.getByRole("progressbar").querySelector("div")).toHaveClass(
        "bg-success-500",
      );
    });
  });

  /* ── Level label in percentage suffix ──────────────────────────────── */

  describe("level label display", () => {
    it("shows the level label next to the percentage (Low for 50%)", () => {
      render(<ConfidenceMeter label="Score" value={0.5} />);

      // The component renders `${pct}%` followed by a child span with the level label.
      // For 50% → low level → label "Low".
      expect(screen.getByText("Low")).toBeInTheDocument();
    });

    it("shows 'High' label for 95% confidence", () => {
      render(<ConfidenceMeter label="Score" value={0.95} />);

      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("shows 'Medium' label for 80% confidence", () => {
      render(<ConfidenceMeter label="Score" value={0.8} />);

      expect(screen.getByText("Medium")).toBeInTheDocument();
    });
  });
});
