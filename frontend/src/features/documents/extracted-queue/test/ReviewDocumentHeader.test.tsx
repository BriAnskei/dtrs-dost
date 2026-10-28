/**
 * Unit tests for `ReviewDocumentHeader` — the title bar on the review screen
 * showing the file name and uploader.
 *
 * THE COMPONENT (review/components/ReviewDocumentHeader.tsx):
 *
 * Props:
 *   - fileName: string
 *   - uploaderName?: string | null
 *
 * Behavior:
 *   - Renders fileName as an <h3> with `title={fileName}` for truncation tooltip.
 *   - Renders "Uploaded by <name>" when uploaderName is a non-null string.
 *   - Renders "Uploaded by Unknown uploader" when uploaderName is null or undefined.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReviewDocumentHeader from "../review/components/ReviewDocumentHeader";

describe("ReviewDocumentHeader", () => {
  describe("file name rendering", () => {
    it("renders the file name as a heading", () => {
      render(<ReviewDocumentHeader fileName="invoice.pdf" />);

      const heading = screen.getByRole("heading", { name: "invoice.pdf" });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe("H3");
      // The title attribute mirrors the file name for the truncation tooltip.
      expect(heading).toHaveAttribute("title", "invoice.pdf");
    });

    it("truncates long file names without changing the rendered text", () => {
      const longName = "a-very-long-file-name-with-many-parts-that-should-truncate.pdf";
      render(<ReviewDocumentHeader fileName={longName} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });
  });

  describe("uploader name", () => {
    it("renders 'Uploaded by <name>' when uploaderName is provided", () => {
      render(<ReviewDocumentHeader fileName="doc.pdf" uploaderName="Jane Doe" />);

      expect(screen.getByText("Uploaded by Jane Doe")).toBeInTheDocument();
    });

    it("renders 'Uploaded by Unknown uploader' when uploaderName is null", () => {
      render(<ReviewDocumentHeader fileName="doc.pdf" uploaderName={null} />);

      expect(screen.getByText("Uploaded by Unknown uploader")).toBeInTheDocument();
    });

    it("renders 'Unknown uploader' when uploaderName is undefined", () => {
      render(<ReviewDocumentHeader fileName="doc.pdf" />);

      expect(screen.getByText("Uploaded by Unknown uploader")).toBeInTheDocument();
    });
  });
});
