/**
 * Unit tests for `ReviewActionBar` — the Save / Invalidate button bar at the
 * bottom of the document review screen.
 *
 * THE COMPONENT (review/components/ReviewActionBar.tsx):
 *
 *   Renders two buttons inside a flex row:
 *     - "Invalidate" (bordered, error-colored) → onClick={onInvalidate}
 *     - "Save as incoming document" (filled, primary) → onClick={onSave}
 *
 * Props:
 *   - onSave: () => void
 *   - onInvalidate: () => void
 *   - disabled?: boolean  (defaults to false)
 *
 * Behavior:
 *   - Both buttons call their handlers when clicked.
 *   - When `disabled` is true, both buttons are disabled (cursor-not-allowed,
 *     opacity-50, and the `disabled` attribute).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReviewActionBar from "../review/components/ReviewActionBar";

describe("ReviewActionBar", () => {
  describe("button rendering", () => {
    it("renders an Invalidate button", () => {
      render(<ReviewActionBar onSave={() => {}} onInvalidate={() => {}} />);

      expect(screen.getByRole("button", { name: "Invalidate" })).toBeInTheDocument();
    });

    it("renders a 'Save as incoming document' button", () => {
      render(<ReviewActionBar onSave={() => {}} onInvalidate={() => {}} />);

      expect(
        screen.getByRole("button", { name: "Save as incoming document" }),
      ).toBeInTheDocument();
    });
  });

  describe("click handlers", () => {
    it("calls onInvalidate when the Invalidate button is clicked", () => {
      const onInvalidate = vi.fn();

      render(<ReviewActionBar onSave={() => {}} onInvalidate={onInvalidate} />);

      fireEvent.click(screen.getByRole("button", { name: "Invalidate" }));

      expect(onInvalidate).toHaveBeenCalledTimes(1);
    });

    it("calls onSave when the Save button is clicked", () => {
      const onSave = vi.fn();

      render(<ReviewActionBar onSave={onSave} onInvalidate={() => {}} />);

      fireEvent.click(screen.getByRole("button", { name: "Save as incoming document" }));

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe("disabled state", () => {
    it("disables both buttons when disabled=true", () => {
      render(<ReviewActionBar onSave={() => {}} onInvalidate={() => {}} disabled />);

      expect(screen.getByRole("button", { name: "Invalidate" })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Save as incoming document" }),
      ).toBeDisabled();
    });

    it("does NOT disable buttons when disabled is not passed (defaults to false)", () => {
      render(<ReviewActionBar onSave={() => {}} onInvalidate={() => {}} />);

      expect(screen.getByRole("button", { name: "Invalidate" })).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Save as incoming document" }),
      ).not.toBeDisabled();
    });

    it("does not call handlers when buttons are disabled and clicked", () => {
      const onSave = vi.fn();
      const onInvalidate = vi.fn();

      render(<ReviewActionBar onSave={onSave} onInvalidate={onInvalidate} disabled />);

      fireEvent.click(screen.getByRole("button", { name: "Invalidate" }));
      fireEvent.click(screen.getByRole("button", { name: "Save as incoming document" }));

      expect(onInvalidate).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
