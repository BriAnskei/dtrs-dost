// ─── QRCodeModal.tsx ───────────────────────────────────────────────────────
// Requires: npm install qrcode.react
//
// Shows a mock document-tracking QR code after a successful upload.
// The QR encodes `trackingUrl`, which is currently a placeholder
// (e.g. https://track.yourapp.com/status/DOC-XXXXXXXX). Swap it out
// once a real client-facing tracking page exists.

import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  trackingId: string;
  trackingUrl: string;
  fileName: string;
}

type CopyState = "idle" | "copied-link" | "copied-image" | "error";

export default function QRCodeModal({
  open,
  onClose,
  trackingId,
  trackingUrl,
  fileName,
}: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  if (!open) return null;

  function resetCopyStateSoon() {
    setTimeout(() => setCopyState("idle"), 1800);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopyState("copied-link");
    } catch {
      setCopyState("error");
    }
    resetCopyStateSoon();
  }

  async function handleCopyImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyState("copied-image");
    } catch {
      setCopyState("error");
    }
    resetCopyStateSoon();
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trackingId}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-theme-md font-semibold text-gray-800 dark:text-white/90">
              Document submitted
            </h3>
            <p className="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px]">
              {fileName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* QR code */}
        <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <QRCodeCanvas
            ref={canvasRef}
            value={trackingUrl}
            size={176}
            level="M"
            bgColor="#ffffff"
            fgColor="#101828"
            includeMargin
          />
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Tracking ID
            </p>
            <p className="mt-0.5 font-mono text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {trackingId}
            </p>
          </div>
        </div>

        <p className="mt-3 text-theme-xs text-gray-400 dark:text-gray-500">
          Share this QR code or link with the client so they can follow their document's
          status.
        </p>

        {/* Link row */}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <span className="flex-1 truncate text-theme-xs text-gray-600 dark:text-gray-400">
            {trackingUrl}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 px-2 py-2.5 text-theme-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.03] transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
            Copy link
          </button>
          <button
            onClick={handleCopyImage}
            className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 px-2 py-2.5 text-theme-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.03] transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy image
          </button>
          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 px-2 py-2.5 text-theme-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.03] transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                transform="rotate(180 12 12)"
              />
            </svg>
            Download
          </button>
        </div>

        {copyState !== "idle" && (
          <p
            className={`mt-3 text-center text-theme-xs font-medium ${
              copyState === "error" ? "text-danger" : "text-success"
            }`}
          >
            {copyState === "copied-link" && "Link copied to clipboard"}
            {copyState === "copied-image" && "QR image copied to clipboard"}
            {copyState === "error" && "Couldn't copy — try downloading instead"}
          </p>
        )}
      </div>
    </div>
  );
}
