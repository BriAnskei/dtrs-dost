import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import type { PdfHighlight } from "./PdfViewer";

interface Props {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  size: { w: number; h: number }; // page size at scale 1 (PDF points)
  cssWidth: number;
  highlights: PdfHighlight[];
  /** Draw an outline around highlight boxes (off = marker-style fill only). */
  showBorders: boolean;
  /** Receives the FieldKey of the clicked highlight. */
  onHighlightClick: (field: string) => void;
  setRef: (el: HTMLDivElement | null) => void;
}

// Marker-style fill: multiply blend keeps the text underneath fully readable.
const HL_FILL = {
  selected: "bg-accent/35 mix-blend-multiply z-2",
  flagged: "bg-accent/20 mix-blend-multiply",
  normal: "bg-secondary/15 mix-blend-multiply",
} as const;

// Optional borders are drawn as an outline *outside* the box so they never cover glyphs.
const HL_BORDER = {
  selected: "outline outline-2 outline-offset-2 outline-accent",
  flagged: "outline outline-1 outline-dashed outline-offset-1 outline-accent",
  normal: "outline outline-1 outline-offset-1 outline-secondary/60",
} as const;

export default function PdfPageWithHighlights({
  pdf,
  pageNumber,
  size,
  cssWidth,
  highlights,
  showBorders,
  onHighlightClick,
  setRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const cssHeight = (cssWidth * size.h) / size.w;

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
            onClick={() => onHighlightClick(h.id)}
            className={`absolute rounded-sm transition ${HL_FILL[h.state]} ${
              showBorders ? HL_BORDER[h.state] : ""
            }`}
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
