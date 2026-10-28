/**
 * Unit tests for `InvalidateDocumentModal` — the modal shown when an admin
 * invalidates an extracted-queue document.
 *
 * THE COMPONENT (review/components/modal/InvalidateDocumentModal.tsx):
 *
 * Props:
 *   - id: string
 *   - fileName: string
 *   - onClose: () => void
 *   - onInvalidated: () => void
 *
 * It uses `useInvalidateDocumentModal({ id, onInvalidated })` which returns:
 *   - response: string (controlled textarea value)
 *   - setResponse: (value: string) => void
 *   - isSubmitting: boolean (mutation in progress)
 *   - handleSubmit: () => void
 *
 * Behavior under test (component-level):
 *   - Renders the modal header with "Invalidate Document" title and the file name.
 *   - Renders the description text about what happens on invalidation.
 *   - Renders a textarea labeled "Response" (optional) for the rationale.
 *   - Changing the textarea updates the response (verified via the textarea value).
 *   - "Cancel" button calls onClose.
 *   - "Invalidate" submit button calls handleSubmit when clicked.
 *   - When isSubmitting, the submit button shows "Invalidating…" and is disabled.
 *   - When isSubmitting, the Cancel button is also disabled.
 *
 * We mock `useInvalidateDocumentModal` to control its return value and spy on
 * the mutation state directly. The Modal component itself is rendered for real
 * (it's a thin portal-based shell).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import InvalidateDocumentModal from "../review/components/modal/InvalidateDocumentModal";

const { mockHook } = vi.hoisted(() => ({
  mockHook: vi.fn(),
}));

vi.mock("../review/hooks/use-invalidate-document-modal", () => ({
  useInvalidateDocumentModal: () => mockHook(),
}));

function makeHookReturn(overrides: Record<string, unknown> = {}) {
  return {
    response: "",
    setResponse: vi.fn(),
    isSubmitting: false,
    handleSubmit: vi.fn(),
    ...overrides,
  };
}

describe("InvalidateDocumentModal", () => {
  const defaultProps = {
    id: "queue-1",
    fileName: "invoice.pdf",
    onClose: vi.fn(),
    onInvalidated: vi.fn(),
  };

  beforeEach(() => {
    mockHook.mockReturnValue(makeHookReturn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("header rendering", () => {
    it("renders 'Invalidate Document' as the title", () => {
      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(screen.getByText("Invalidate Document")).toBeInTheDocument();
    });

    it("renders the file name in the header", () => {
      render(<InvalidateDocumentModal {...defaultProps} fileName="receipt.pdf" />);

      expect(screen.getByText("receipt.pdf")).toBeInTheDocument();
    });
  });

  describe("body content", () => {
    it("renders the warning description about invalidating", () => {
      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(
        screen.getByText(/This document will be marked as invalid and removed from the extraction queue./),
      ).toBeInTheDocument();
      expect(screen.getByText(/This can't be undone./)).toBeInTheDocument();
    });

    it("renders a 'Response' textarea with optional hint", () => {
      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(screen.getByLabelText(/Response/)).toBeInTheDocument();
      expect(screen.getByText("(optional)")).toBeInTheDocument();
      expect(
        screen.getByText(/Shown to the uploader so they know why it was invalidated./),
      ).toBeInTheDocument();
    });

    it("renders the textarea with a placeholder", () => {
      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(
        screen.getByPlaceholderText("e.g. The scan is unreadable. Please re-upload a clearer copy."),
      ).toBeInTheDocument();
    });

    it("updates response when the textarea value changes", () => {
      const setResponse = vi.fn();
      mockHook.mockReturnValue(makeHookReturn({ setResponse }));

      render(<InvalidateDocumentModal {...defaultProps} />);

      const textarea = screen.getByLabelText(/Response/);

      fireEvent.change(textarea, { target: { value: "Scan is blurry" } });

      expect(setResponse).toHaveBeenCalledWith("Scan is blurry");
    });
  });

  describe("footer actions", () => {
    it("renders a Cancel button and an Invalidate button", () => {
      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Invalidate" })).toBeInTheDocument();
    });

    it("calls onClose when Cancel is clicked", () => {
      const onClose = vi.fn();
      render(<InvalidateDocumentModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls handleSubmit when Invalidate is clicked", () => {
      const handleSubmit = vi.fn();
      mockHook.mockReturnValue(makeHookReturn({ handleSubmit }));

      render(<InvalidateDocumentModal {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Invalidate" }));

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("submitting state", () => {
    it("shows 'Invalidating…' on the submit button when isSubmitting", () => {
      mockHook.mockReturnValue(makeHookReturn({ isSubmitting: true }));

      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(screen.getByText("Invalidating…")).toBeInTheDocument();
    });

    it("disables the Invalidate button when isSubmitting", () => {
      mockHook.mockReturnValue(makeHookReturn({ isSubmitting: true }));

      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Invalidating…" })).toBeDisabled();
    });

    it("disables the Cancel button when isSubmitting", () => {
      mockHook.mockReturnValue(makeHookReturn({ isSubmitting: true }));

      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    it("disables the textarea when isSubmitting", () => {
      mockHook.mockReturnValue(makeHookReturn({ isSubmitting: true }));

      render(<InvalidateDocumentModal {...defaultProps} />);

      expect(screen.getByLabelText(/Response/)).toBeDisabled();
    });
  });

  describe("close (X) button", () => {
    it("calls onClose when the X close button is clicked", () => {
      const onClose = vi.fn();
      render(<InvalidateDocumentModal {...defaultProps} onClose={onClose} />);

      // The Modal backdrop also has aria-label="Close modal", so we filter to
      // the one inside the header (the X button, not the backdrop).
      const closeButtons = screen.getAllByLabelText("Close modal");
      // The header's X button is the one that has an SVG child with the
      // "M6 18L18 6" path (the X icon), not the backdrop.
      const xButton = closeButtons.find((btn) =>
        btn.querySelector("svg path")?.getAttribute("d") === "M6 18L18 6M6 6l12 12",
      );
      fireEvent.click(xButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
