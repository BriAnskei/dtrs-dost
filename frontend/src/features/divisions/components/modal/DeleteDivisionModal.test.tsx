/**
 * Component (UI) tests for `DeleteDivisionModal` — the real modal, not a stub.
 *
 * WHY THIS FILE EXISTS:
 *   The table-level test stubs this modal to keep kebab→modal assertions
 *   focused. This file verifies the modal's own rendering logic, per the user's
 *   request to separate action-process state tests into dedicated per-modal
 *   files using the real components.
 *
 * STRATEGY:
 *   Render the real `<DeleteDivisionModal>` with controlled props; assert on the
 *   DOM rendered via `createPortal` into `document.body`.
 *
 * Covered scenarios:
 *   1. Title includes the division name ("Delete {name}?").
 *   2. "Delete" button present and enabled when isDeleting=false.
 *   3. isDeleting=true → button reads "Deleting…" + is disabled.
 *   4. isDeleting=true → Cancel button is also disabled.
 *   5. isDeleting=false → Cancel is enabled.
 *   6. Confirm click → onConfirm called once.
 *   7. Cancel click → onClose called.
 *   8. When `error` is set → error message renders on the button area.
 *   9. When `error` is NOT set → no error message in the DOM.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Division } from "../../type/division.type";
import DeleteDivisionModal from "./DeleteDivisionModal";

const EQUIPMENT: Division = {
  id: "d4",
  name: "Equipment Division",
  users: [],
  userCount: 0,
};

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(
    <DeleteDivisionModal
      division={EQUIPMENT}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      {...overrides}
    />,
  );
}

describe("DeleteDivisionModal (UI)", () => {
  // ── Title ───────────────────────────────────────────────────────────────────

  it("includes the division name in the title", () => {
    renderModal();
    expect(
      screen.getByText('Delete "Equipment Division"?'),
    ).toBeInTheDocument();
  });

  // ── Button text / disabled states ──────────────────────────────────────────

  it("renders a 'Delete' button (enabled) when isDeleting is false", () => {
    renderModal();
    const confirmBtn = screen.getByText("Delete");
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).not.toBeDisabled();
  });

  it("renders 'Deleting…' + disables Confirm when isDeleting is true", () => {
    renderModal({ isDeleting: true });
    const confirmBtn = screen.getByText("Deleting…");
    expect(confirmBtn).toBeDisabled();
  });

  it("disables Cancel button when isDeleting is true", () => {
    renderModal({ isDeleting: true });
    const cancelBtn = screen.getByText("Cancel");
    expect(cancelBtn).toBeDisabled();
  });

  it("enables Cancel button when isDeleting is false", () => {
    renderModal();
    const cancelBtn = screen.getByText("Cancel");
    expect(cancelBtn).not.toBeDisabled();
  });

  // ── Callbacks ───────────────────────────────────────────────────────────────

  it("calls onConfirm once when Delete is clicked", () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });
    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Error rendering ─────────────────────────────────────────────────────────

  it("renders the error message when `error` prop is set", () => {
    renderModal({
      error: {
        message: "Failed to delete division: you are in use.",
      },
    });
    expect(
      screen.getByText("Failed to delete division: you are in use."),
    ).toBeInTheDocument();
  });

  it("does NOT render an error message when `error` is absent", () => {
    renderModal();
    // No error text should be present; asserting absence by checking that
    // the specific error string from another test isn't found.
    expect(screen.queryByText(/Failed to delete/i)).not.toBeInTheDocument();
  });
});
