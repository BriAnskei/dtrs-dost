/**
 * Component (UI) tests for `EditDivisionModal` — the real modal, not a stub.
 *
 * WHY THIS FILE EXISTS:
 *   The table-level test (`DivisionManagementTable.test.tsx`) stubs the modal
 *   to keep the kebab→modal wiring assertions sharp. This file verifies the
 *   modal's own rendering logic: pre-filled input, save/cancel interactions,
 *   and the action-state indicators ("Saving…" button, disabled close, auto-
 *   close on mutation settle) that the user asked to be covered.
 *
 * STRATEGY:
 *   Render the real `<EditDivisionModal>` with controlled props; assert on the
 *   DOM rendered via `createPortal` into `document.body`. No hook or service
 *   mocking needed — the modal is purely presentational (it calls `onSave` /
 *   `onClose` callbacks).
 *
 * Covered scenarios:
 *   1. Input is pre-filled with the division's current name.
 *   2. Typing + Save → onSave called with the trimmed name.
 *   3. Pressing Enter in the input → onSave called.
 *   4. isSaving=true → Save button reads "Saving…" + is disabled; Close (X)
 *      button is also disabled.
 *   5. isSaving=false → Save button reads "Save" + is enabled; Close is enabled.
 *   6. Empty name → error message "Name can't be empty." appears, onSave not
 *      called.
 *   7. Unchanged name → onSave not called, modal closes via onClose.
 *   8. Auto-close: when isSaving flips from true → false, onClose is invoked
 *      (mirrors the real "mutation settled → close" lifecycle).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Division } from "../../type/division.type";
import EditDivisionModal from "./EditDivisionModal";

const CIVIL_WORKS: Division = {
  id: "d1",
  name: "Civil Works Division",
  users: [],
  userCount: 0,
};

describe("EditDivisionModal (UI)", () => {
  // ── Pre-filled input ──────────────────────────────────────────────────────

  it("pre-fills the input with the division's current name", () => {
    render(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const input = screen.getByDisplayValue("Civil Works Division");
    expect(input).toBeInTheDocument();
  });

  // ── Save interaction ──────────────────────────────────────────────────────

  it("calls onSave with the trimmed name when Save is clicked", () => {
    const onSave = vi.fn();
    render(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Highway Division  " } });

    fireEvent.click(screen.getByText("Save"));

    // Trimmed — no leading/trailing whitespace.
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("Highway Division");
  });

  it("calls onSave when Enter is pressed in the input", () => {
    const onSave = vi.fn();
    render(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Infrastructure Division" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("Infrastructure Division");
  });

  // ── Action-state: isSaving ────────────────────────────────────────────────

  it("shows 'Saving…' + disables buttons when isSaving is true", () => {
    render(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={vi.fn()}
        onSave={vi.fn()}
        isSaving
      />,
    );

    const saveBtn = screen.getByText("Saving…");
    expect(saveBtn).toBeDisabled();

    // The X close button (in header) is disabled during saving.
    // Note: the Modal backdrop button also has aria-label="Close modal", so we
    // can't use getByLabelText. Instead, find the header X button by its SVG.
    const xButtons = screen.getAllByRole("button", { hidden: true });
    // The X button contains an SVG with the "X" path (M6 18L18 6M6 6l12 12).
    const closeXBtn = xButtons.find((btn) => {
      const svg = btn.querySelector("svg");
      if (!svg) return false;
      const path = svg.querySelector("path");
      return path?.getAttribute("d") === "M6 18L18 6M6 6l12 12";
    });
    expect(closeXBtn).toBeDefined();
    expect(closeXBtn).toBeDisabled();
  });

  it("shows 'Save' + enables buttons when isSaving is false", () => {
    render(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />,
    );

    const saveBtn = screen.getByText("Save");
    expect(saveBtn).not.toBeDisabled();

    const cancelBtn = screen.getByText("Cancel");
    expect(cancelBtn).not.toBeDisabled();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("shows an error and does NOT call onSave when the name is empty", () => {
    const onSave = vi.fn();
    render(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByText("Save"));

    expect(screen.getByText("Name can't be empty.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("closes the modal (onClose) instead of calling onSave when name is unchanged", () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    // Input already has the division name; clicking Save without changes.
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Auto-close on mutation settle ─────────────────────────────────────────

  it("auto-closes (calls onClose) when isSaving flips from true to false", () => {
    /*
     * Mirrors the real "mutation settled → close" lifecycle: the modal tracks
     * isSaving in a ref; when it transitions true → false it calls onClose.
     */
    const onClose = vi.fn();
    const { rerender } = render(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={onClose}
        onSave={vi.fn()}
        isSaving
      />,
    );

    // Still saving — modal should NOT have closed yet.
    expect(onClose).not.toHaveBeenCalled();

    // Mutation resolved — isSaving drops to false.
    rerender(
      <EditDivisionModal
        division={CIVIL_WORKS}
        onClose={onClose}
        onSave={vi.fn()}
        isSaving={false}
      />,
    );

    // The useEffect detected the transition and fired onClose.
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
