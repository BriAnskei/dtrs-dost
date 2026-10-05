/**
 * Unit tests for `ReviewFieldList` — the list of extracted-field rows on the
 * right-hand side of the Review step.
 *
 * THE COMPONENT (components/ReviewFieldList.tsx):
 *
 * Props:
 *   - rows: ResultRow[]
 *   - edits: Partial<Record<FieldKey, string>>
 *   - selected: FieldKey | null
 *   - onSelect, onMove, onNextFlagged, flaggedCount
 *
 * Rendering rules:
 *   - Header: "All fields pass" when flaggedCount === 0, else "N of M fields need review"
 *   - "↑↓ to navigate" hint text shown on sm+ screens.
 *   - "Next flagged ⚑" button only when flaggedCount > 0.
 *   - One <button role="option"> per row with FIELD_LABELS[field] as the label.
 *   - Active row: secondary ring. Flagged row: warning border. Normal: gray border.
 *   - "Edited" badge when field is in edits.
 *   - Confidence: "N%" or "Not found" (null). Flagged fields show "⚑ review".
 *   - Value: edits[field] if edited, else r.value. Empty edited value → italic "Empty".
 *   - No-value + not edited → "Not found" with text-danger.
 *   - ArrowUp/ArrowDown → onMove(-1/+1).
 *   - Click row → onSelect(field).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReviewFieldList from "../admins/components/ReviewFieldList";
import { FIELD_LABELS } from "../constans";
import type { FieldKey, ResultRow } from "../types/extraction-types";

function row(
  field: FieldKey,
  overrides: Partial<ResultRow> = {},
): ResultRow {
  return {
    field,
    value: "default value",
    page: 1,
    chunkIds: ["chunk-1"],
    highlights: [{ page: 1, bbox: { x: 0, y: 0, w: 0.1, h: 0.1 } }],
    aiConfidence: 95,
    sourceConfidence: 100,
    effectiveConfidence: 95,
    ...overrides,
  };
}

describe("ReviewFieldList", () => {
  describe("header text", () => {
    it("shows 'All fields pass' when flaggedCount is 0", () => {
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.getByText("All fields pass")).toBeInTheDocument();
    });

    it("shows 'N of M fields need review' when flaggedCount > 0", () => {
      render(
        <ReviewFieldList
          rows={[row("subject"), row("from")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={1}
        />,
      );

      expect(screen.getByText("1 of 2 fields need review")).toBeInTheDocument();
    });
  });

  describe("Next flagged button", () => {
    it("renders the Next flagged button when flaggedCount > 0", () => {
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={1}
        />,
      );

      expect(screen.getByText("Next flagged ⚑")).toBeInTheDocument();
    });

    it("does NOT render the Next flagged button when flaggedCount === 0", () => {
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.queryByText("Next flagged ⚑")).not.toBeInTheDocument();
    });

    it("calls onNextFlagged when the Next flagged button is clicked", () => {
      const onNextFlagged = vi.fn();
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={onNextFlagged}
          flaggedCount={1}
        />,
      );

      fireEvent.click(screen.getByText("Next flagged ⚑"));

      expect(onNextFlagged).toHaveBeenCalledTimes(1);
    });
  });

  describe("field rows", () => {
    it("renders a row for each result row", () => {
      const rows = [row("subject"), row("from"), row("to")];
      render(
        <ReviewFieldList
          rows={rows}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(3);
    });

    it("shows FIELD_LABELS for each row", () => {
      const rows = [row("subject"), row("from")];
      render(
        <ReviewFieldList
          rows={rows}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.getByText(FIELD_LABELS.subject)).toBeInTheDocument();
      expect(screen.getByText(FIELD_LABELS.from)).toBeInTheDocument();
    });

    it("calls onSelect with the field key when a row is clicked", () => {
      const onSelect = vi.fn();
      render(
        <ReviewFieldList
          rows={[row("subject"), row("from")]}
          edits={{}}
          selected={null}
          onSelect={onSelect}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      const options = screen.getAllByRole("option");
      fireEvent.click(options[1]);

      expect(onSelect).toHaveBeenCalledWith("from");
    });

    it("marks the selected row with aria-selected='true'", () => {
      render(
        <ReviewFieldList
          rows={[row("subject"), row("from")]}
          edits={{}}
          selected="from"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "false");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("confidence display", () => {
    it("shows 'N%' for effective confidence that is not null", () => {
      render(
        <ReviewFieldList
          rows={[row("subject", { effectiveConfidence: 87 })]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.getByText("87%")).toBeInTheDocument();
    });

    it("shows 'Not found' for null effective confidence", () => {
      render(
        <ReviewFieldList
          rows={[row("subject", { effectiveConfidence: null })]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={1}
        />,
      );

      expect(screen.getByText("Not found")).toBeInTheDocument();
    });

    it("shows '⚑ review' next to confidence for flagged fields", () => {
      render(
        <ReviewFieldList
          rows={[row("subject", { effectiveConfidence: 50 })]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={1}
        />,
      );

      expect(screen.getByText("⚑ review")).toBeInTheDocument();
    });

    it("does NOT show '⚑ review' for non-flagged fields", () => {
      render(
        <ReviewFieldList
          rows={[row("subject", { effectiveConfidence: 95 })]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.queryByText("⚑ review")).not.toBeInTheDocument();
    });
  });

  describe("edited indicator", () => {
    it("shows 'Edited' badge when the field is in edits", () => {
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{ subject: "edited value" }}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.getByText("Edited")).toBeInTheDocument();
    });

    it("does NOT show 'Edited' badge when the field is not in edits", () => {
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.queryByText("Edited")).not.toBeInTheDocument();
    });
  });

  describe("value display", () => {
    it("shows edits[field] when the field has been edited", () => {
      render(
        <ReviewFieldList
          rows={[row("subject", { value: "original" })]}
          edits={{ subject: "custom value" }}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.getByText("custom value")).toBeInTheDocument();
    });

    it("shows 'Not found' (danger) when value is null and not edited", () => {
      render(
        <ReviewFieldList
          rows={[row("subject", { value: null, effectiveConfidence: null })]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={1}
        />,
      );

      expect(screen.getByText("Not found")).toBeInTheDocument();
    });

    it("shows italic 'Empty' when edited value is empty string", () => {
      render(
        <ReviewFieldList
          rows={[row("subject", { value: null })]}
          edits={{ subject: "" }}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={1}
        />,
      );

      expect(screen.getByText("Empty")).toBeInTheDocument();
    });
  });

  describe("keyboard navigation", () => {
    it("calls onMove(1) on ArrowDown", () => {
      const onMove = vi.fn();
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={onMove}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      const list = screen.getByRole("listbox");
      fireEvent.keyDown(list, { key: "ArrowDown" });

      expect(onMove).toHaveBeenCalledWith(1);
    });

    it("calls onMove(-1) on ArrowUp", () => {
      const onMove = vi.fn();
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={onMove}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      const list = screen.getByRole("listbox");
      fireEvent.keyDown(list, { key: "ArrowUp" });

      expect(onMove).toHaveBeenCalledWith(-1);
    });

    it("does NOT call onMove for other keys", () => {
      const onMove = vi.fn();
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={onMove}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      const list = screen.getByRole("listbox");
      fireEvent.keyDown(list, { key: "Enter" });

      expect(onMove).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("listbox has aria-label='Extracted fields'", () => {
      render(
        <ReviewFieldList
          rows={[row("subject")]}
          edits={{}}
          selected="subject"
          onSelect={() => {}}
          onMove={() => {}}
          onNextFlagged={() => {}}
          flaggedCount={0}
        />,
      );

      expect(screen.getByRole("listbox", { name: "Extracted fields" })).toBeInTheDocument();
    });
  });
});
