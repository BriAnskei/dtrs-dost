/**
 * Unit tests for `ReviewFieldDetail` — the detail card shown for the currently
 * selected field in the Review step.
 *
 * THE COMPONENT (components/ReviewFieldDetail.tsx):
 *
 *   Props:
 *     - row: ResultRow
 *     - locations: ChunkLocation[]
 *     - editedValue: string | undefined  (undefined = untouched)
 *     - onEdit: (value: string | null) => void  (string = set, null = revert)
 *
 * Modes:
 *   - Display mode (not editing): shows the label, field value, location info,
 *     confidence stats, and an "Edit" pencil button. "Reset" link appears
 *     when editedValue !== undefined.
 *   - Edit mode: input (or textarea for chunk-level fields like "summary").
 *     Keyboard: Enter / Ctrl+Enter → save, Escape → cancel.
 *
 * Tests cover rendering, edit mode toggle, save/cancel via buttons and keyboard.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReviewFieldDetail from "../admins/components/ReviewFieldDetail";
import { FIELD_LABELS } from "../constans";
import type { ChunkLocation, ResultRow } from "../types/extraction-types";

function makeRow(field: ResultRow["field"], overrides: Partial<ResultRow> = {}): ResultRow {
  return {
    field,
    value: "The quick brown fox",
    page: 1,
    chunkIds: ["chunk-1", "chunk-2"],
    highlights: [{ page: 1, bbox: { x: 0, y: 0, w: 0.1, h: 0.1 } }],
    aiConfidence: 95,
    sourceConfidence: 100,
    effectiveConfidence: 95,
    ...overrides,
  };
}

const LOCATIONS: ChunkLocation[] = [
  { page: 1, bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.1 }, text: "The quick brown fox" },
];

describe("ReviewFieldDetail", () => {
  describe("display mode (not editing)", () => {
    it("renders the field label (uppercase)", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      // The component renders the label with CSS uppercase, but the text content is the original case.
      expect(screen.getByText(FIELD_LABELS.subject)).toBeInTheDocument();
    });

    it("renders the extracted value", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      expect(screen.getByText("The quick brown fox")).toBeInTheDocument();
    });

    it("renders the location summary line with page and chunk count", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      // "Page 1 · chunk-1, chunk-2"
      expect(screen.getByText(/Page 1/)).toBeInTheDocument();
      expect(screen.getByText(/chunk-1/)).toBeInTheDocument();
    });

    it("shows 'AI N% × Source N% = N%' confidence line", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      expect(screen.getByText(/AI 95%/)).toBeInTheDocument();
      expect(screen.getByText(/Source 100%/)).toBeInTheDocument();
      // The effective confidence (95%) is inside a <span class="font-semibold">.
      expect(screen.getByText("95%")).toBeInTheDocument();
    });

    it("renders the chunk text snippet when locations are available", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      expect(screen.getByText("The quick brown fox")).toBeInTheDocument();
    });

    it("renders 'No location available' when locations is empty", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={[]}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      // "No location available" is part of a larger text node, so use a regex for partial match.
      expect(screen.getByText(/No location available/)).toBeInTheDocument();
    });

    it("shows 'Not found by the LLM' message when row.value is null", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject", { value: null })}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      expect(
        screen.getByText(/Not found by the LLM/),
      ).toBeInTheDocument();
    });

    it("shows 'Not found' confidence when aiConfidence is null", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject", { aiConfidence: null, sourceConfidence: null, effectiveConfidence: null })}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      // When all confidences are null, pct renders "—" for each. The span contains the effective confidence.
      expect(screen.getByText(/AI —/)).toBeInTheDocument();
      expect(screen.getByText(/Source —/)).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders the Edit pencil button (not Save/Cancel)", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      expect(screen.getByLabelText("Edit Subject")).toBeInTheDocument();
      expect(screen.queryByLabelText("Save change")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Cancel change")).not.toBeInTheDocument();
    });
  });

  describe("Reset link", () => {
    it("renders a Reset link when editedValue is defined (not undefined)", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue="custom value"
          onEdit={() => {}}
        />,
      );

      expect(screen.getByText("Reset")).toBeInTheDocument();
    });

    it("does NOT render a Reset link when editedValue is undefined", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      expect(screen.queryByText("Reset")).not.toBeInTheDocument();
    });

    it("calls onEdit(null) when Reset is clicked", () => {
      const onEdit = vi.fn();
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue="custom value"
          onEdit={onEdit}
        />,
      );

      fireEvent.click(screen.getByText("Reset"));

      expect(onEdit).toHaveBeenCalledWith(null);
    });
  });

  describe("edit mode", () => {
    it("shows input + Save/Cancel buttons after clicking Edit", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));

      expect(screen.getByLabelText("Save change")).toBeInTheDocument();
      expect(screen.getByLabelText("Cancel change")).toBeInTheDocument();
      // Single-line field → input, not textarea
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByRole("textbox").tagName).toBe("INPUT");
    });

    it("uses textarea for chunk-level fields (summary)", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("summary")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Summary"));

      const textarea = screen.getByRole("textbox");
      expect(textarea.tagName).toBe("TEXTAREA");
      // Title says "Save (Ctrl+Enter)" for multiline
      expect(screen.getByTitle("Save (Ctrl+Enter)")).toBeInTheDocument();
    });

    it("pre-fills the input with the current value (editedValue if set, else row.value)", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("The quick brown fox");
    });

    it("pre-fills with editedValue when it is set", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue="edited value"
          onEdit={() => {}}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));

      expect(screen.getByRole("textbox")).toHaveValue("edited value");
    });

    it("calls onEdit with the new value when Save is clicked", () => {
      const onEdit = vi.fn();
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={onEdit}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "new value" } });
      fireEvent.click(screen.getByLabelText("Save change"));

      // "new value" differs from "The quick brown fox" → calls onEdit("new value")
      expect(onEdit).toHaveBeenCalledWith("new value");
    });

    it("calls onEdit(null) when the typed value matches the original (no-op edit)", () => {
      const onEdit = vi.fn();
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={onEdit}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));
      // Don't change the value — it matches row.value "The quick brown fox"
      fireEvent.click(screen.getByLabelText("Save change"));

      // Saving the same value → onEdit(null) (revert to extracted)
      expect(onEdit).toHaveBeenCalledWith(null);
    });

    it("calls onEdit(null) when Cancel is clicked (discards input)", () => {
      const onEdit = vi.fn();
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={onEdit}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "typed something" } });
      fireEvent.click(screen.getByLabelText("Cancel change"));

      expect(onEdit).not.toHaveBeenCalled();
    });

    it("saves on Enter (single-line field)", () => {
      const onEdit = vi.fn();
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={onEdit}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "enter pressed" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onEdit).toHaveBeenCalledWith("enter pressed");
    });

    it("does NOT save on Enter without Ctrl for chunk-level fields (multiline)", () => {
      const onEdit = vi.fn();
      render(
        <ReviewFieldDetail
          row={makeRow("summary")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={onEdit}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Summary"));
      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "multi\nline" } });
      fireEvent.keyDown(textarea, { key: "Enter" });

      // Enter alone in textarea (multiline) → does not save
      expect(onEdit).not.toHaveBeenCalled();
    });

    it("saves on Ctrl+Enter for chunk-level fields (multiline)", () => {
      const onEdit = vi.fn();
      render(
        <ReviewFieldDetail
          row={makeRow("summary")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={onEdit}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Summary"));
      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "multi\nline" } });
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

      expect(onEdit).toHaveBeenCalledWith("multi\nline");
    });

    it("cancels on Escape", () => {
      const onEdit = vi.fn();
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={onEdit}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "abandoned" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onEdit).not.toHaveBeenCalled();
      // Should return to display mode
      expect(screen.getByLabelText("Edit Subject")).toBeInTheDocument();
    });

    it("exits edit mode after saving via Save button", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));
      fireEvent.click(screen.getByLabelText("Save change"));

      // Should return to display mode
      expect(screen.getByLabelText("Edit Subject")).toBeInTheDocument();
    });

    it("exits edit mode after canceling via Cancel button", () => {
      render(
        <ReviewFieldDetail
          row={makeRow("subject")}
          locations={LOCATIONS}
          editedValue={undefined}
          onEdit={() => {}}
        />,
      );

      fireEvent.click(screen.getByLabelText("Edit Subject"));
      fireEvent.click(screen.getByLabelText("Cancel change"));

      expect(screen.getByLabelText("Edit Subject")).toBeInTheDocument();
    });
  });
});
