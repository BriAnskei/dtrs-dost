/**
 * Unit tests for `FilterPopover` — the dropdown filter panel in the ExtractedQueueTable
 * toolbar. It wraps the generic `Popover` and contains decision radio buttons and an
 * "unknown uploader" toggle switch.
 *
 * THE COMPONENT (queue-list/components/FilterPopover.tsx):
 *
 * Props:
 *   - decision: Decision | undefined
 *   - onDecisionChange: (value: Decision | undefined) => void
 *   - unknownUploader: boolean
 *   - onUnknownUploaderChange: (value: boolean) => void
 *   - activeCount: number  (shown as a badge on the Filter button)
 *   - onReset: () => void
 *
 * Behavior:
 *   - The Filter button shows a badge with activeCount when > 0.
 *   - Clicking the Filter button opens the popover panel (role="dialog").
 *   - Decision radios: "All decisions", "For Review", "Accepted", "Invalid".
 *     Clicking a radio calls onDecisionChange with the corresponding value.
 *   - Unknown uploader: a role="switch" toggle that calls onUnknownUploaderChange(!unknownUploader).
 *   - "Reset filters" button only appears when activeCount > 0; calls onReset.
 *   - Clicking outside (or pressing Escape) closes the popover.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FilterPopover from "../queue-list/components/FilterPopover";

const NO_OP = () => {};

describe("FilterPopover", () => {
  describe("Filter trigger button", () => {
    it("renders a 'Filter' button as the trigger", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      expect(screen.getByRole("button", { name: /Filter/ })).toBeInTheDocument();
    });

    it("shows an active-count badge when activeCount > 0", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={2}
          onReset={NO_OP}
        />,
      );

      // The badge is a span with the count number inside the button.
      const badge = screen.getByText("2");
      expect(badge).toBeInTheDocument();
      // The badge has rounded-full for pill styling.
      expect(badge.closest("span")).toHaveClass("rounded-full");
    });

    it("does NOT show a badge when activeCount is 0", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      const filterButton = screen.getByRole("button", { name: /Filter/ });
      expect(filterButton).toBeInTheDocument();
      // No badge span with a count number inside the button.
      const badge = filterButton.querySelector(".rounded-full");
      expect(badge).toBeNull();
    });

    it("opens the popover panel when the Filter button is clicked", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      // The popover panel renders with role="dialog".
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("decision radio buttons", () => {
    it("renders radio options: All decisions, For Review, Accepted, Invalid", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      // The panel is closed by default; open it first.
      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      expect(screen.getByText("Decision")).toBeInTheDocument();
      expect(screen.getByText("All decisions")).toBeInTheDocument();
      expect(screen.getByText("For Review")).toBeInTheDocument();
      expect(screen.getByText("Accepted")).toBeInTheDocument();
      expect(screen.getByText("Invalid")).toBeInTheDocument();
    });

    it("marks the currently-selected decision radio as checked", () => {
      render(
        <FilterPopover
          decision="ACCEPT"
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      // The radio inputs are not directly gettable by role, so we find them by
      // checking that the "Accepted" label's preceding input is checked.
      const acceptedLabel = screen.getByText("Accepted");
      const radio = acceptedLabel.closest("label")?.querySelector('input[type="radio"]');
      expect(radio).toBeChecked();
    });

    it("calls onDecisionChange with the new value when a radio is clicked", () => {
      const onDecisionChange = vi.fn();

      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={onDecisionChange}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      // Click the "Invalid" radio.
      const invalidLabel = screen.getByText("Invalid");
      const invalidRadio = invalidLabel.closest("label")?.querySelector('input[type="radio"]');
      fireEvent.click(invalidRadio!);

      expect(onDecisionChange).toHaveBeenCalledWith("INVALID");
    });

    it("calls onDecisionChange with undefined when 'All decisions' is clicked", () => {
      // Start with a decision set.
      const onDecisionChange = vi.fn();

      render(
        <FilterPopover
          decision="REVIEW"
          onDecisionChange={onDecisionChange}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      // Click "All decisions" radio — its value is undefined.
      const allLabel = screen.getByText("All decisions");
      const allRadio = allLabel.closest("label")?.querySelector('input[type="radio"]');
      fireEvent.click(allRadio!);

      expect(onDecisionChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("unknown uploader switch", () => {
    it("renders a role='switch' toggle", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("has aria-checked='false' when unknownUploader is false", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });

    it("has aria-checked='true' when unknownUploader is true", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={true}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    it("calls onUnknownUploaderChange with true when toggled from false", () => {
      const onUnknownUploaderChange = vi.fn();

      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={onUnknownUploaderChange}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
      fireEvent.click(screen.getByRole("switch"));

      expect(onUnknownUploaderChange).toHaveBeenCalledWith(true);
    });

    it("calls onUnknownUploaderChange with false when toggled from true", () => {
      const onUnknownUploaderChange = vi.fn();

      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={true}
          onUnknownUploaderChange={onUnknownUploaderChange}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
      fireEvent.click(screen.getByRole("switch"));

      expect(onUnknownUploaderChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Reset filters button", () => {
    it("renders a Reset button when activeCount > 0", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={true}
          onUnknownUploaderChange={NO_OP}
          activeCount={1}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      expect(screen.getByRole("button", { name: "Reset filters" })).toBeInTheDocument();
    });

    it("does NOT render a Reset button when activeCount is 0", () => {
      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={false}
          onUnknownUploaderChange={NO_OP}
          activeCount={0}
          onReset={NO_OP}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

      expect(screen.queryByRole("button", { name: "Reset filters" })).not.toBeInTheDocument();
    });

    it("calls onReset when Reset filters is clicked", () => {
      const onReset = vi.fn();

      render(
        <FilterPopover
          decision={undefined}
          onDecisionChange={NO_OP}
          unknownUploader={true}
          onUnknownUploaderChange={NO_OP}
          activeCount={1}
          onReset={onReset}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
      fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});
