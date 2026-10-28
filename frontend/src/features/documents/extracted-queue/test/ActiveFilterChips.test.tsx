/**
 * Unit tests for `ActiveFilterChips` — the inline filter-pill bar under the
 * ExtractedQueueTable toolbar.
 *
 * THE COMPONENT (queue-list/components/ActiveFilterChips.tsx):
 *
 * Props:
 *   - decision: Decision | undefined
 *   - unknownUploader: boolean
 *   - onClearDecision: () => void
 *   - onClearUnknownUploader: () => void
 *   - onClearAll: () => void
 *
 * Behavior:
 *   - Renders nothing when no filter is active (decision undefined, unknownUploader false).
 *   - When `decision` is set: shows a chip labeled "Decision: <label>" with a remove
 *     button (aria-label "Remove filter: Decision: <label>").
 *   - When `unknownUploader` is true: shows a chip labeled "Unknown uploader" with a
 *     remove button (aria-label "Remove filter: Unknown uploader").
 *   - "Clear all" button only renders when there are 2+ chips.
 *   - Clicking a chip's remove button calls the corresponding onClear handler.
 *   - Clicking "Clear all" calls onClearAll.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ActiveFilterChips from "../queue-list/components/ActiveFilterChips";
import type { Decision } from "../../extraction/types/extraction-types";

describe("ActiveFilterChips", () => {
  const NO_OP = () => {};

  describe("no filters active", () => {
    it("renders nothing when decision is undefined and unknownUploader is false", () => {
      const { container } = render(
        <ActiveFilterChips
          decision={undefined}
          unknownUploader={false}
          onClearDecision={NO_OP}
          onClearUnknownUploader={NO_OP}
          onClearAll={NO_OP}
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("decision chip", () => {
    it.each(["ACCEPT", "REVIEW", "INVALID"] as Decision[])(
      "renders a chip labeled 'Decision: <label>' when decision is %s",
      (decision) => {
        const labels: Record<Decision, string> = {
          ACCEPT: "Accepted",
          REVIEW: "For Review",
          INVALID: "Invalid",
        };

        render(
          <ActiveFilterChips
            decision={decision}
            unknownUploader={false}
            onClearDecision={NO_OP}
            onClearUnknownUploader={NO_OP}
            onClearAll={NO_OP}
          />,
        );

        const expectedLabel = `Decision: ${labels[decision]}`;
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();

        // The remove button has an aria-label that includes the chip label.
        expect(
          screen.getByLabelText(`Remove filter: ${expectedLabel}`),
        ).toBeInTheDocument();
      },
    );

    it("calls onClearDecision when the decision chip's remove button is clicked", () => {
      const onClearDecision = vi.fn();

      render(
        <ActiveFilterChips
          decision="ACCEPT"
          unknownUploader={false}
          onClearDecision={onClearDecision}
          onClearUnknownUploader={NO_OP}
          onClearAll={NO_OP}
        />,
      );

      fireEvent.click(screen.getByLabelText("Remove filter: Decision: Accepted"));

      expect(onClearDecision).toHaveBeenCalledTimes(1);
    });
  });

  describe("unknown-uploader chip", () => {
    it("renders a chip labeled 'Unknown uploader' when unknownUploader is true", () => {
      render(
        <ActiveFilterChips
          decision={undefined}
          unknownUploader={true}
          onClearDecision={NO_OP}
          onClearUnknownUploader={NO_OP}
          onClearAll={NO_OP}
        />,
      );

      expect(screen.getByText("Unknown uploader")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Remove filter: Unknown uploader"),
      ).toBeInTheDocument();
    });

    it("calls onClearUnknownUploader when the chip's remove button is clicked", () => {
      const onClearUnknownUploader = vi.fn();

      render(
        <ActiveFilterChips
          decision={undefined}
          unknownUploader={true}
          onClearDecision={NO_OP}
          onClearUnknownUploader={onClearUnknownUploader}
          onClearAll={NO_OP}
        />,
      );

      fireEvent.click(screen.getByLabelText("Remove filter: Unknown uploader"));

      expect(onClearUnknownUploader).toHaveBeenCalledTimes(1);
    });
  });

  describe("multiple chips", () => {
    it("renders both chips when decision and unknownUploader are both active", () => {
      render(
        <ActiveFilterChips
          decision="REVIEW"
          unknownUploader={true}
          onClearDecision={NO_OP}
          onClearUnknownUploader={NO_OP}
          onClearAll={NO_OP}
        />,
      );

      expect(screen.getByText("Decision: For Review")).toBeInTheDocument();
      expect(screen.getByText("Unknown uploader")).toBeInTheDocument();
    });

    it("renders a Clear all button when there are 2+ chips", () => {
      render(
        <ActiveFilterChips
          decision="REVIEW"
          unknownUploader={true}
          onClearDecision={NO_OP}
          onClearUnknownUploader={NO_OP}
          onClearAll={NO_OP}
        />,
      );

      expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
    });

    it("calls onClearAll when Clear all is clicked", () => {
      const onClearAll = vi.fn();

      render(
        <ActiveFilterChips
          decision="REVIEW"
          unknownUploader={true}
          onClearDecision={NO_OP}
          onClearUnknownUploader={NO_OP}
          onClearAll={onClearAll}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

      expect(onClearAll).toHaveBeenCalledTimes(1);
    });

    it("does NOT render Clear all when only 1 chip is active", () => {
      render(
        <ActiveFilterChips
          decision="ACCEPT"
          unknownUploader={false}
          onClearDecision={NO_OP}
          onClearUnknownUploader={NO_OP}
          onClearAll={NO_OP}
        />,
      );

      expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
    });
  });
});
