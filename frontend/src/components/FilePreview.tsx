import { Download, ExternalLink, FileText, RefreshCw } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import * as pdfjs from "pdfjs-dist";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";

// Skip this block if the worker is already configured globally.
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
}

interface FilePreviewProps {
  blob: Blob | undefined;
  fileName?: string;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  /** Height of the viewing area. Default is compact on phones, taller from `sm`. */
  heightClassName?: string;
}

type FileKind = "pdf" | "image" | "other";

const PAD = 24; // matches p-3 on the scroll container (both sides)

const ICON_BTN =
  "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-200/70 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100";

function detectKind(blob: Blob, fileName?: string): FileKind {
  const name = fileName?.toLowerCase() ?? "";
  // octet-stream is common for blob responses, so fall back to the extension.
  if (blob.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (blob.type.startsWith("image/")) return "image";
  return "other";
}

export default function FilePreview({
  blob,
  fileName,
  isLoading,
  isError,
  onRetry,
  heightClassName = "h-96 sm:h-120",
}: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  // Object URL lives in state + effect (not useMemo) so StrictMode's
  // mount/cleanup/mount cycle can't leave us holding a revoked URL.
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  const name = fileName || "document";
  const kind = blob ? detectKind(blob, fileName) : null;

  let content: ReactNode;
  if (isLoading) {
    content = <PreviewSkeleton label="Loading document…" />;
  } else if (isError || !blob) {
    content = (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-theme-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load the document file.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-theme-xs text-gray-700 transition hover:border-secondary/40 dark:border-white/8 dark:bg-white/3 dark:text-gray-200"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    );
  } else if (kind === "pdf") {
    content = <PdfPages blob={blob} />;
  } else if (kind === "image" && url) {
    content = (
      <div className="custom-scrollbar flex h-full items-start justify-center overflow-auto p-3">
        <img
          src={url}
          alt={name}
          className="h-auto max-w-full rounded bg-white shadow-sm"
        />
      </div>
    );
  } else {
    content = (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <FileText
          className="h-8 w-8 text-gray-300 dark:text-gray-600"
          aria-hidden="true"
        />
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          Preview isn&apos;t available for this file type. Use the download button
          instead.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/8">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-white/8 dark:bg-white/3">
        <span className="flex min-w-0 items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300">
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate" title={name}>
            {name}
          </span>
        </span>

        {url && (
          <div className="flex shrink-0 items-center gap-0.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in new tab"
              title="Open in new tab"
              className={ICON_BTN}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={url}
              download={name}
              aria-label="Download file"
              title="Download"
              className={ICON_BTN}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      <div className={`bg-gray-100 dark:bg-gray-900 ${heightClassName}`}>{content}</div>
    </div>
  );
}

function PreviewSkeleton({ label }: { label: string }) {
  return (
    <div
      className="flex h-full items-start justify-center overflow-hidden p-3"
      role="status"
      aria-label={label}
    >
      <div className="aspect-[1/1.414] w-full max-w-sm animate-pulse rounded bg-white shadow-sm dark:bg-white/5" />
    </div>
  );
}

/* ------------------------------ PDF rendering ------------------------------ */

function PdfPages({ blob }: { blob: Blob }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;
    setPdf(null);
    setError(false);
    (async () => {
      try {
        const data = await blob.arrayBuffer();
        doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        setPdf(doc);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [blob]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(0, el.clientWidth - PAD));
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  if (error) {
    return (
      <p className="p-6 text-center text-theme-sm text-red-600 dark:text-red-400">
        Could not open this PDF.
      </p>
    );
  }

  return (
    <div ref={scrollRef} className="custom-scrollbar h-full overflow-auto p-3">
      {!pdf || width <= 0 ? (
        <PreviewSkeleton label="Rendering document…" />
      ) : (
        Array.from({ length: pdf.numPages }, (_, i) => i + 1).map((n) => (
          <PdfPage key={n} pdf={pdf} pageNumber={n} width={width} rootRef={scrollRef} />
        ))
      )}
    </div>
  );
}

function PdfPage({
  pdf,
  pageNumber,
  width,
  rootRef,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(pageNumber === 1);
  const [ratio, setRatio] = useState(1.414); // placeholder until the real page is measured

  // Render a page once it is near the viewport (and keep it rendered afterwards).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear((prev) => prev || entry.isIntersecting),
      { root: rootRef.current, rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (!near || width <= 0) return;
    let cancelled = false;
    let task: RenderTask | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / base.width });
        setRatio(viewport.height / viewport.width);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        task = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await task.promise;
        page.cleanup();
      } catch {
        // RenderingCancelledException is expected when width/page changes mid-render.
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [near, pdf, pageNumber, width]);

  return (
    <div
      ref={wrapRef}
      className="mx-auto mb-3 bg-white shadow-sm last:mb-0"
      style={{ width, height: width * ratio }}
    >
      <canvas ref={canvasRef} className="block" aria-label={`Page ${pageNumber}`} />
    </div>
  );
}
