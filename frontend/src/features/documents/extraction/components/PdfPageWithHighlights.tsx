import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import type { PdfHighlight } from "./PdfViewer";

interface Props {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  size: { w: number; h: number }; // page size at scale 1 (PDF points)
  cssWidth: number;
  highlights: PdfHighlight[];
  /** Receives the FieldKey of the clicked highlight. */
  onHighlightClick: (field: string) => void;
  setRef: (el: HTMLDivElement | null) => void;
}

const HL_STYLE = {
  selected:
    "border-2 border-accent bg-accent/30 shadow-[0_0_0_3px_rgba(245,158,11,0.25)] z-2",
  flagged: "border border-dashed border-accent bg-accent/10",
  normal: "border border-secondary/60 bg-secondary/10",
} as const;

export default function PdfPageWithHighlights({
  pdf,
  pageNumber,
  size,
  cssWidth,
  highlights,
  onHighlightClick,
  setRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const cssHeight = (cssWidth * size.h) / size.w;

  // Placeholder keeps the real height, so scroll offsets are right before render.
  // Pages render lazily once they come into view.
  // TODO: release canvases of far-away pages if very long PDFs become an issue.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || cssWidth <= 0) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    (async () => {
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      // Render at the real device scale so text stays sharp.
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: (cssWidth / size.w) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      task = page.render({ canvas, canvasContext: ctx, viewport });
      try {
        await task.promise;
      } catch {
        /* render cancelled by a zoom change, ignore */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [near, pdf, pageNumber, cssWidth, size.w]);

  // A field can have several boxes; only the first one carries the label tag.
  const isFirstOfField = (h: PdfHighlight) =>
    highlights.find((x) => x.field === h.field)?.id === h.id;

  return (
    <div
      ref={(el) => {
        wrapRef.current = el;
        setRef(el);
      }}
      className="relative bg-white shadow-theme-sm"
      style={{ width: cssWidth, height: cssHeight }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: cssWidth, height: cssHeight }}
        className="block"
      />
      {/* Percent-positioned overlay: lives inside the page, so it scrolls and zooms with it */}
      <div className="absolute inset-0">
        {highlights.map((h) => (
          <button
            key={h.id}
            type="button"
            title={h.label}
            aria-label={`Highlight: ${h.label}`}
            onClick={() => onHighlightClick(h.field)}
            className={`absolute rounded-sm transition ${HL_STYLE[h.state]}`}
            style={{
              left: `${h.bbox.x * 100}%`,
              top: `${h.bbox.y * 100}%`,
              width: `${h.bbox.w * 100}%`,
              height: `${h.bbox.h * 100}%`,
            }}
          >
            {h.state === "selected" && isFirstOfField(h) && (
              <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-theme-xs font-medium text-white">
                {h.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
