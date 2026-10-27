import type { PDFDocumentProxy } from "pdfjs-dist";
import * as pdfjs from "pdfjs-dist";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BBox } from "../../types/extraction-types";
import PdfPageWithHighlights from "./PdfPageWithHighlights";

// Skip this block if your source extraction already configures the worker.
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
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
  onFieldClick: (field: string) => void;
}

const ZOOMS = [0.75, 1, 1.25, 1.5, 2]; // multiples of fit-to-width
const PAD = 32;

const btn =
  "px-2.5 py-1 text-theme-xs rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 transition disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/8 dark:bg-white/3 dark:text-gray-200";

function PdfViewerImpl({ file, highlights, selectedId, onFieldClick }: Props) {
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
        if (cancelled) return;
        setPdf(d);
        // Seed page 1's size for first paint; load the rest in the background.
        const v1 = (await d.getPage(1)).getViewport({ scale: 1 });
        setSizes([{ w: v1.width, h: v1.height }]);
        // Fire-and-forget the remaining pages — they fill in as they resolve.
        (async () => {
          const rest = await Promise.all(
            Array.from({ length: d.numPages - 1 }, async (_, i) => {
              const pg = await d.getPage(i + 2);
              const v = pg.getViewport({ scale: 1 });
              pg.cleanup();
              return { w: v.width, h: v.height };
            }),
          );
          if (cancelled) return;
          setSizes((prev) => {
            const merged = [...prev];
            for (let i = 0; i < rest.length; i++) merged[i + 1] = rest[i];
            while (merged.length < d.numPages) merged.push({ w: 0, h: 0 });
            return merged;
          });
        })();
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

  // Track layout readiness to avoid scroll-jumps before pages paint.
  const layoutReady = useRef(true);

  // Memoize filtered highlights so PdfPageWithHighlights gets stable arrays.
  const shown = useMemo(
    () => (showAll ? highlights : highlights.filter((h) => h.field === selectedId)),
    [highlights, showAll, selectedId],
  );

  // Pre-compute per-page highlight slices to avoid inline filter on each render.
  const highlightsByPage = useMemo(() => {
    const map = new Map<number, PdfHighlight[]>();
    for (const h of shown) {
      const arr = map.get(h.page) ?? [];
      arr.push(h);
      map.set(h.page, arr);
    }
    return map;
  }, [shown]);

  // Field -> document: scroll to the topmost highlight of the selected field.
  // Only runs when selectedId changes — not on zoom/layout width, which
  // would yank the user away from their reading position.
  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;

  useEffect(() => {
    if (!selectedId || numPages === 0 || !layoutReady.current) return;
    const mine = highlightsRef.current.filter((x) => x.field === selectedId);
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
  }, [selectedId, numPages]);

  // Throttle scroll via rAF coalescing for large documents.
  const onScroll = useMemo(
    () =>
      (() => {
        let ticking = false;
        return () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            ticking = false;
            const box = scrollRef.current;
            if (!box) return;
            const mid = box.scrollTop + box.clientHeight / 2;
            let cur = 1;
            for (let i = 1; i <= numPages; i++) {
              const el = pageEls.current[i];
              if (el && el.offsetTop <= mid) cur = i;
            }
            setCurrentPage(cur);
          });
        };
      })(),
    [numPages],
  );

  // Highlight ids are per-box; the parent only cares about the field
  const handleHighlightClick = useCallback(
    (id: string) => {
      const h = highlights.find((x) => x.id === id);
      if (h) onFieldClick(h.field);
    },
    [highlights, onFieldClick],
  );

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
            {sizes.map((size, pageNumber) => {
              const i = pageNumber + 1;
              return size.w > 0 && size.h > 0 ? (
                <PdfPageWithHighlights
                  key={i}
                  pdf={pdf}
                  pageNumber={i}
                  size={size}
                  cssWidth={pageWidth}
                  highlights={highlightsByPage.get(i) ?? []}
                  showBorders={showBorders}
                  onFieldClick={handleHighlightClick}
                  setRef={(el) => {
                    pageEls.current[i] = el;
                  }}
                />
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PdfViewerImpl, (prev, next) => {
  return (
    prev.file === next.file &&
    prev.highlights === next.highlights &&
    prev.selectedId === next.selectedId &&
    prev.onFieldClick === next.onFieldClick
  );
});
