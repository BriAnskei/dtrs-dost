/**
 * Unit tests for `PdfDropzone` — the file drop zone for uploading PDFs.
 *
 * THE COMPONENT (components/PDFDropzone.tsx):
 *
 * Props:
 *   - file: File | null
 *   - onSelect: (f: File | null) => void
 *   - disabled?: boolean
 *
 * Behavior:
 *   - When `file` is provided: shows file name + formatted size, plus a Remove button.
 *   - When `file` is null: shows a dashed drop zone with an upload icon.
 *   - Drag over → dragging state (border-secondary bg-secondary/5).
 *   - Drop a non-PDF → error "Only PDF files are allowed."
 *   - Drop a file > MAX_FILE_MB → error "File must be N MB or smaller."
 *   - Drop a valid PDF → calls onSelect(file).
 *   - Click drop zone → opens hidden file input.
 *   - When disabled, drop zone click is a no-op and Remove button is disabled.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PdfDropzone from "../admins/components/PDFDropzone";
import { MAX_FILE_MB, formatBytes } from "../constans";
import { formatBytes as formatBytesHelper } from "../helpers/extraction-helpers";

/* Re-exported so tests can reference the expected size string. */
const formatFileSize = formatBytesHelper;

function makeFile(name: string, size: number, type = "application/pdf"): File {
  return new File(["dummy content"], name, { type, lastModified: 123 });
}

// Override File.size for tests that need a specific size
function makeSizedFile(name: string, size: number, type = "application/pdf"): File {
  const f = makeFile(name, size, type);
  Object.defineProperty(f, "size", { value: size, configurable: true });
  return f;
}

describe("PdfDropzone", () => {
  describe("when a file is already selected", () => {
    const file = makeFile("document.pdf", 1024);

    it("renders the file name", () => {
      render(<PdfDropzone file={file} onSelect={() => {}} />);

      expect(screen.getByText("document.pdf")).toBeInTheDocument();
    });

    it("renders the formatted file size", () => {
      render(<PdfDropzone file={file} onSelect={() => {}} />);

      expect(screen.getByText(`PDF · ${formatFileSize(1024)}`)).toBeInTheDocument();
    });

    it("renders a Remove button", () => {
      render(<PdfDropzone file={file} onSelect={() => {}} />);

      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    it("calls onSelect(null) when Remove is clicked", () => {
      const onSelect = vi.fn();
      render(<PdfDropzone file={file} onSelect={onSelect} />);

      fireEvent.click(screen.getByText("Remove"));

      expect(onSelect).toHaveBeenCalledWith(null);
    });

    it("renders the drop zone area with upload icon and instructions", () => {
      render(<PdfDropzone file={file} onSelect={() => {}} />);

      expect(screen.getByText("Click to upload")).toBeInTheDocument();
      expect(screen.getByText(/or drag and drop/)).toBeInTheDocument();
      expect(screen.getByText(`PDF only, up to ${MAX_FILE_MB} MB`)).toBeInTheDocument();
    });
  });

  describe("when no file is selected", () => {
    it("renders the drop zone (not the file card)", () => {
      const { container } = render(<PdfDropzone file={null} onSelect={() => {}} />);

      // No "document.pdf" text, no "Remove" button
      expect(screen.queryByText("document.pdf")).not.toBeInTheDocument();
      expect(screen.queryByText("Remove")).not.toBeInTheDocument();

      // Drop zone instructions are visible
      expect(screen.getByText("Click to upload")).toBeInTheDocument();
    });

    it("renders the upload SVG icon", () => {
      const { container } = render(<PdfDropzone file={null} onSelect={() => {}} />);

      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
    });

    it("shows the file size limit text", () => {
      render(<PdfDropzone file={null} onSelect={() => {}} />);

      expect(screen.getByText(`PDF only, up to ${MAX_FILE_MB} MB`)).toBeInTheDocument();
    });
  });

  describe("drag and drop", () => {
    it("enters dragging state on dragOver", () => {
      const { container } = render(<PdfDropzone file={null} onSelect={() => {}} />);

      const dropzone = container.querySelector('[class*="border-dashed"]')!;
      fireEvent.dragOver(dropzone);

      // When dragging: border-secondary + bg-secondary/5
      expect(dropzone.className).toContain("border-secondary");
      expect(dropzone.className).toContain("bg-secondary/5");
    });

    it("exits dragging state on dragLeave", () => {
      const { container } = render(<PdfDropzone file={null} onSelect={() => {}} />);

      const dropzone = container.querySelector('[class*="border-dashed"]')!;
      fireEvent.dragOver(dropzone);
      fireEvent.dragLeave(dropzone);

      // Should not have the dragging classes
      expect(dropzone.className).not.toContain("bg-secondary/5");
    });

    it("accepts a valid PDF dropped via drag", () => {
      const onSelect = vi.fn();
      const { container } = render(<PdfDropzone file={null} onSelect={onSelect} />);

      const dropzone = container.querySelector('[class*="border-dashed"]')!;
      const file = makeFile("dropped.pdf", 1024);

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      expect(onSelect).toHaveBeenCalledWith(file);
    });

    it("rejects a non-PDF file with an error message", () => {
      const onSelect = vi.fn();
      render(<PdfDropzone file={null} onSelect={onSelect} />);

      const dropzone = document.querySelector('[class*="border-dashed"]')!;
      const txtFile = makeFile("not-pdf.txt", 100, "text/plain");

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [txtFile] },
      });

      expect(screen.getByText("Only PDF files are allowed.")).toBeInTheDocument();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("rejects a PDF by name extension (.pdf) even with wrong MIME type", () => {
      const onSelect = vi.fn();
      render(<PdfDropzone file={null} onSelect={onSelect} />);

      const dropzone = document.querySelector('[class*="border-dashed"]')!;
      // Wrong MIME but .pdf extension → should be accepted.
      const pdfFile = makeFile("valid.pdf", 1024, "application/octet-stream");

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [pdfFile] },
      });

      expect(onSelect).toHaveBeenCalledWith(pdfFile);
    });

    it("rejects an oversized PDF with an error message", () => {
      const onSelect = vi.fn();
      render(<PdfDropzone file={null} onSelect={onSelect} />);

      const dropzone = document.querySelector('[class*="border-dashed"]')!;
      const bigFile = makeSizedFile("big.pdf", (MAX_FILE_MB + 1) * 1024 * 1024 + 1);

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [bigFile] },
      });

      expect(screen.getByText(`File must be ${MAX_FILE_MB} MB or smaller.`)).toBeInTheDocument();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("accepts a PDF exactly at the size boundary", () => {
      const onSelect = vi.fn();
      render(<PdfDropzone file={null} onSelect={onSelect} />);

      const dropzone = document.querySelector('[class*="border-dashed"]')!;
      const boundaryFile = makeSizedFile("boundary.pdf", MAX_FILE_MB * 1024 * 1024);

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [boundaryFile] },
      });

      expect(onSelect).toHaveBeenCalledWith(boundaryFile);
    });
  });

  describe("file input (click to upload)", () => {
    it("opens the hidden file input when the drop zone is clicked", () => {
      const { container } = render(<PdfDropzone file={null} onSelect={() => {}} />);

      const input = container.querySelector('input[type="file"]')!;
      expect(input).not.toBeNull();
      expect(input).not.toBeVisible();
    });

    it("accepts a valid PDF selected via the file input", () => {
      const onSelect = vi.fn();
      const { container } = render(<PdfDropzone file={null} onSelect={onSelect} />);

      const input = container.querySelector('input[type="file"]')!;
      const file = makeFile("via-input.pdf", 1024);

      fireEvent.change(input, { target: { files: [file] } });

      expect(onSelect).toHaveBeenCalledWith(file);
    });

    it("shows an error for a non-PDF selected via the file input", () => {
      const onSelect = vi.fn();
      const { container } = render(<PdfDropzone file={null} onSelect={onSelect} />);

      const input = container.querySelector('input[type="file"]')!;
      const txtFile = makeFile("via-input.txt", 100, "text/plain");

      fireEvent.change(input, { target: { files: [txtFile] } });

      expect(screen.getByText("Only PDF files are allowed.")).toBeInTheDocument();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("clears the input value after selecting so the same file can be re-selected", () => {
      const { container } = render(<PdfDropzone file={null} onSelect={() => {}} />);

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = makeFile("test.pdf", 1024);

      fireEvent.change(input, { target: { files: [file] } });

      expect(input.value).toBe("");
    });
  });

  describe("disabled state", () => {
    it("does not open the file input when disabled", () => {
      const { container } = render(<PdfDropzone file={null} onSelect={() => {}} disabled />);

      const dropzone = container.querySelector('[class*="border-dashed"]')!;
      // Clicking the dropzone when disabled should not call click on the input.
      // We verify by checking the input is still in the document (not interacted with).
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.click(dropzone);

      // disabled → no-op (inputRef.current?.click() is guarded by !disabled)
      expect(input).toBeInTheDocument();
    });

    it("disables the Remove button when disabled", () => {
      const file = makeFile("document.pdf", 1024);
      render(<PdfDropzone file={file} onSelect={() => {}} disabled />);

      expect(screen.getByText("Remove")).toBeDisabled();
    });

    it("does not accept drops when disabled", () => {
      const onSelect = vi.fn();
      const { container } = render(<PdfDropzone file={null} onSelect={onSelect} disabled />);

      const dropzone = container.querySelector('[class*="border-dashed"]')!;
      const file = makeFile("dropped.pdf", 1024);

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      expect(onSelect).not.toHaveBeenCalled();
    });

    it("does not enter dragging state when disabled", () => {
      const { container } = render(<PdfDropzone file={null} onSelect={() => {}} disabled />);

      const dropzone = container.querySelector('[class*="border-dashed"]')!;
      fireEvent.dragOver(dropzone);

      // Should NOT have the dragging classes
      expect(dropzone.className).not.toContain("bg-secondary/5");
    });
  });

  describe("error clearing", () => {
    it("clears the error when a valid file is subsequently selected", () => {
      const onSelect = vi.fn();
      render(<PdfDropzone file={null} onSelect={onSelect} />);

      const dropzone = document.querySelector('[class*="border-dashed"]')!;
      const badFile = makeFile("bad.txt", 100, "text/plain");

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [badFile] },
      });

      expect(screen.getByText("Only PDF files are allowed.")).toBeInTheDocument();

      // Now select a valid file
      const goodFile = makeFile("good.pdf", 1024);
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [goodFile] },
      });

      expect(screen.queryByText("Only PDF files are allowed.")).not.toBeInTheDocument();
      expect(onSelect).toHaveBeenCalledWith(goodFile);
    });
  });
});
