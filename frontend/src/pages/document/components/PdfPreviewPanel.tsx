import type React from "react";
import { useMemo, useState } from "react";
import { Document, Page } from "react-pdf";
import { PANEL_HEIGHT, PDF_PAGE_WIDTH } from "./constants";

interface PdfPreviewPanelProps {
  file: File;
  onClear: () => void;
}

const PdfPreviewPanel: React.FC<PdfPreviewPanelProps> = ({ file, onClear }) => {
  const [pageCount, setPageCount] = useState(0);
  const fileUrl = useMemo(() => URL.createObjectURL(file), [file]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600 dark:bg-red-500/10 dark:text-red-400">
            PDF
          </span>
          <span className="truncate text-theme-xs text-gray-600 dark:text-gray-300">
            {file.name}
          </span>
          {pageCount > 0 && (
            <span className="shrink-0 text-theme-xs text-gray-400 dark:text-gray-500">
              · {pageCount} {pageCount === 1 ? "page" : "pages"}
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          aria-label="Remove file"
          className="ml-2 shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-200 hover:text-danger dark:hover:bg-gray-700 dark:hover:text-danger"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div
        className="overflow-y-auto rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
        style={{ maxHeight: PANEL_HEIGHT }}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setPageCount(numPages)}
          className="flex flex-col items-center gap-3 py-4"
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <Page
              key={`page-${i + 1}`}
              pageNumber={i + 1}
              width={PDF_PAGE_WIDTH}
              renderTextLayer
              renderAnnotationLayer
              className="shadow-md"
            />
          ))}
        </Document>
      </div>
    </div>
  );
};

export default PdfPreviewPanel;
