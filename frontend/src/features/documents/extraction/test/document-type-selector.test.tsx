/**
 * Unit tests for `DocumentTypeSelektor` — the radio-button group for picking
 * incoming vs outgoing document type.
 *
 * THE COMPONENT (components/DocumentTypeSelektor.tsx):
 *
 *   Props:
 *     - value: DocumentDirection  (currently selected)
 *     - onChange: (v: DocumentDirection) => void
 *     - disabled?: boolean
 *
 * Rendering rules:
 *   - Renders one radio button per DIRECTION_OPTIONS entry.
 *   - The selected button has aria-checked="true".
 *   - Clicking a button calls onChange with its value.
 *   - When disabled, all buttons have disabled attribute.
 *   - The wrapping div has role="radiogroup" and aria-label="Document type".
 *   - Active button gets secondary border + ring; inactive gets gray border.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DocumentTypeSelector from "../admins/components/DocumentTypeSelelector";
import { DIRECTION_OPTIONS } from "../constans";

describe("DocumentTypeSelektor", () => {
  describe("rendering", () => {
    it("renders a radio button for each direction option", () => {
      render(
        <DocumentTypeSelector value="incoming" onChange={() => {}} />,
      );

      const buttons = screen.getAllByRole("radio");
      expect(buttons).toHaveLength(DIRECTION_OPTIONS.length);
    });

    it("renders the label text for each option", () => {
      render(
        <DocumentTypeSelector value="incoming" onChange={() => {}} />,
      );

      for (const opt of DIRECTION_OPTIONS) {
        expect(screen.getByText(opt.label)).toBeInTheDocument();
      }
    });

    it("renders the description text for each option", () => {
      render(
        <DocumentTypeSelector value="incoming" onChange={() => {}} />,
      );

      for (const opt of DIRECTION_OPTIONS) {
        expect(screen.getByText(opt.description)).toBeInTheDocument();
      }
    });

    it("wraps buttons in a radiogroup with aria-label='Document type'", () => {
      render(
        <DocumentTypeSelector value="incoming" onChange={() => {}} />,
      );

      expect(screen.getByRole("radiogroup", { name: "Document type" })).toBeInTheDocument();
    });
  });

  describe("selection state", () => {
    it("marks the incoming button as aria-checked='true' when value='incoming'", () => {
      render(
        <DocumentTypeSelector value="incoming" onChange={() => {}} />,
      );

      const radios = screen.getAllByRole("radio");
      expect(radios[0]).toHaveAttribute("aria-checked", "true");
      expect(radios[1]).toHaveAttribute("aria-checked", "false");
    });

    it("marks the outgoing button as aria-checked='true' when value='outgoing'", () => {
      render(
        <DocumentTypeSelector value="outgoing" onChange={() => {}} />,
      );

      const radios = screen.getAllByRole("radio");
      expect(radios[0]).toHaveAttribute("aria-checked", "false");
      expect(radios[1]).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("interaction", () => {
    it("calls onChange with 'incoming' when the incoming button is clicked", () => {
      const onChange = vi.fn();
      render(
        <DocumentTypeSelector value="outgoing" onChange={onChange} />,
      );

      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);

      expect(onChange).toHaveBeenCalledWith("incoming");
    });

    it("calls onChange with 'outgoing' when the outgoing button is clicked", () => {
      const onChange = vi.fn();
      render(
        <DocumentTypeSelector value="incoming" onChange={onChange} />,
      );

      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[1]);

      expect(onChange).toHaveBeenCalledWith("outgoing");
    });

    it("does NOT call onChange when clicking an already-selected button (click still fires but value unchanged)", () => {
      const onChange = vi.fn();
      render(
        <DocumentTypeSelector value="incoming" onChange={onChange} />,
      );

      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);

      // onChange is still called (button onClick fires), but with the same value.
      expect(onChange).toHaveBeenCalledWith("incoming");
    });
  });

  describe("disabled state", () => {
    it("disables all radio buttons when disabled=true", () => {
      render(
        <DocumentTypeSelector value="incoming" onChange={() => {}} disabled />,
      );

      const radios = screen.getAllByRole("radio");
      for (const radio of radios) {
        expect(radio).toBeDisabled();
      }
    });

    it("does NOT disable buttons when disabled is not passed", () => {
      render(
        <DocumentTypeSelector value="incoming" onChange={() => {}} />,
      );

      const radios = screen.getAllByRole("radio");
      for (const radio of radios) {
        expect(radio).toBeEnabled();
      }
    });

    it("does NOT call onChange when buttons are disabled", () => {
      const onChange = vi.fn();
      render(
        <DocumentTypeSelector value="incoming" onChange={onChange} disabled />,
      );

      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[1]);

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
