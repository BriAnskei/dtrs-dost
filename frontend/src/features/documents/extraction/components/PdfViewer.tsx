import type { PDFDocumentProxy } from "pdfjs-dist";
import * as pdfjs from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import type { BBox } from "../types/extraction-types";
import PdfPageWithHighlights from "./PdfPageWithHighlights";

// Skip this block if your source extraction already configures the worker.
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

export interface PdfHighlight {
  id: string; // unique per box, e.g. `${field}:${i}`
  field: string; // what selectedId matches
  page: number; // 1-based
  bbox: BBox;
  label: string;
  state: "selected" | "flagged" | "normal";
}

interface Props {
  file: File;
  highlights: PdfHighlight[];
  selectedId: string | null;
  onHighlightClick: (field: string) => void;
}

const ZOOMS = [0.75, 1, 1.25, 1.5, 2]; // multiples of fit-to-width
const PAD = 32;

const btn =
  "px-2.5 py-1 text-theme-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 transition disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/8 dark:bg-white/3 dark:text-gray-200";

export default function PdfViewer({
  file,
  highlights,
  selectedId,
  onHighlightClick,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<Record<number, HTMLDivElement | null>>({});
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [containerW, setContainerW] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(1);
  const [showAll, setShowAll] = useState(true);
  const [showBorders, setShowBorders] = useState(false); // marker style by default
  const [currentPage, setCurrentPage] = useState(1);

  // Load the PDF from the in-memory File (no server round trip)
  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const data = await file.arrayBuffer();
        doc = await pdfjs.getDocument({ data }).promise;
        const d = doc;
        const dims = await Promise.all(
          Array.from({ length: d.numPages }, async (_, i) => {
            const v = (await d.getPage(i + 1)).getViewport({ scale: 1 });
            return { w: v.width, h: v.height };
          }),
        );
        if (cancelled) return;
        setPdf(d);
        setSizes(dims);
      } catch {
        if (!cancelled) setError("Could not open this PDF.");
      }
    })();
    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [file]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const numPages = sizes.length;
  const pageWidth = Math.max(0, containerW - PAD) * ZOOMS[zoomIdx];

  const shown = showAll ? highlights : highlights.filter((h) => h.field === selectedId);

  // Field -> document: scroll to the topmost highlight of the selected field
  useEffect(() => {
    if (!selectedId || numPages === 0 || pageWidth === 0) return;
    const mine = highlights.filter((x) => x.field === selectedId);
    const h =
      mine.length > 0
        ? mine.reduce((a, b) =>
            b.page < a.page || (b.page === a.page && b.bbox.y < a.bbox.y) ? b : a,
          )
        : undefined;
    const box = scrollRef.current;
    const pageEl = h && pageEls.current[h.page];
    if (!h || !box || !pageEl) return;
    const top = pageEl.offsetTop + h.bbox.y * pageEl.offsetHeight - box.clientHeight / 3;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on selection/layout changes
  }, [selectedId, numPages, pageWidth]);

  const onScroll = () => {
    const box = scrollRef.current;
    if (!box) return;
    const mid = box.scrollTop + box.clientHeight / 2;
    let cur = 1;
    for (let i = 1; i <= numPages; i++) {
      const el = pageEls.current[i];
      if (el && el.offsetTop <= mid) cur = i;
    }
    setCurrentPage(cur);
  };

  // Highlight ids are per-box; the parent only cares about the field
  const handleHighlightClick = (id: string) => {
    const h = highlights.find((x) => x.id === id);
    if (h) onHighlightClick(h.field);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-white/8">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/8 dark:bg-white/3">
        <span className="text-theme-xs text-gray-600 dark:text-gray-300">
          Page {currentPage} / {numPages || "—"}
        </span>
        <div className="flex items-center gap-2">
          <label className="mr-1 flex cursor-pointer items-center gap-1.5 text-theme-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            All highlights
          </label>
          <label className="mr-1 flex cursor-pointer items-center gap-1.5 text-theme-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showBorders}
              onChange={(e) => setShowBorders(e.target.checked)}
            />
            Borders
          </label>
          <button
            type="button"
            className={btn}
            disabled={zoomIdx === 0}
            onClick={() => setZoomIdx((z) => z - 1)}
            aria-label="Zoom out"
          >
            −
          </button>
          <button type="button" className={btn} onClick={() => setZoomIdx(1)}>
            {Math.round(ZOOMS[zoomIdx] * 100)}%
          </button>
          <button
            type="button"
            className={btn}
            disabled={zoomIdx === ZOOMS.length - 1}
            onClick={() => setZoomIdx((z) => z + 1)}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="custom-scrollbar relative flex-1 overflow-auto bg-gray-100 p-4 dark:bg-gray-900"
      >
        {error && <p className="text-theme-sm text-danger">{error}</p>}
        {!error && !pdf && (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            Loading document...
          </p>
        )}
        {pdf && pageWidth > 0 && (
          <div className="mx-auto space-y-4" style={{ width: pageWidth }}>
            {sizes.map((size, i) => (
              <PdfPageWithHighlights
                key={i}
                pdf={pdf}
                pageNumber={i + 1}
                size={size}
                cssWidth={pageWidth}
                highlights={shown.filter((h) => h.page === i + 1)}
                showBorders={showBorders}
                onHighlightClick={handleHighlightClick}
                setRef={(el) => {
                  pageEls.current[i + 1] = el;
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
