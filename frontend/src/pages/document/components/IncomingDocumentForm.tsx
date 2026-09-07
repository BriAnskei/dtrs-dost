// ─── DocumentUploadForm.tsx ───────────────────────────────────────────────────
// Requires: npm install qrcode.react
// Add QRCodeModal.tsx alongside this file (or adjust the import path below).

import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import QRCodeModal from "../../../components/receiver/QRCodeModal";

// ── Helpers ──────────────────────────────────────────────

function formatDate(date: Date) {
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Mock tracking ID/URL generator — replace trackingUrl's base once a real
// client-facing status page exists.
function generateTracking() {
  const id = `DOC-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
  const url = `${window.location.origin}/document/track`;
  return { id, url };
}

const ACCEPTED = ".pdf";
const MAX_MB = 20;

// ── Component ─────────────────────────────────────────────

export default function IncomingDocumentForm() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tracking, setTracking] = useState<{ id: string; url: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const today = formatDate(new Date());

  // ── File management ──

  function addFile(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const candidate = incoming[0];
    const ext = candidate.name.split(".").pop()?.toLowerCase() ?? "";

    if (ext !== "pdf") {
      setFileError("Only PDF files are accepted.");
      return;
    }
    if (candidate.size > MAX_MB * 1024 * 1024) {
      setFileError(`File exceeds the ${MAX_MB} MB limit.`);
      return;
    }

    setFileError(null);
    setFile(candidate);
    setSubmitted(false);
    setTracking(null);
  }

  function removeFile() {
    setFile(null);
    setFileError(null);
    setSubmitted(false);
    setProgress(0);
    setTracking(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Drag events ──

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave() {
    setIsDragging(false);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFile(e.dataTransfer.files);
  }
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    addFile(e.target.files);
  }

  // ── Submit ──

  function handleSubmit() {
    if (!file || isSubmitting) return;
    setIsSubmitting(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 18 + 8;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsSubmitting(false);
            setSubmitted(true);
            setProgress(0);
            const newTracking = generateTracking();
            setTracking(newTracking);
            setShowQrModal(true);
          }, 400);
          return 100;
        }
        return next;
      });
    }, 120);
  }

  // ── Shared classes ──

  const inputCls =
    "flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-theme-sm font-medium text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300";

  const labelCls =
    "text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500";

  return (
    <div className="space-y-5">
      {/* ── Meta row ── */}
      <div className="flex flex-col gap-1.5">
        <span className={labelCls}>Date of upload</span>
        <div className={inputCls}>
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {today}
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-white/[0.05]" />

      {/* ── Dropzone ── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        aria-label="Upload document"
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors duration-150 ${
          isDragging
            ? "border-secondary bg-secondary/5"
            : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.14]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={onChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.05]">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <div>
          <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
            Drag and drop your PDF file here
          </p>
          <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
            or{" "}
            <span className="text-secondary font-medium underline underline-offset-2">
              browse to upload
            </span>
          </p>
        </div>

        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          PDF only — max {MAX_MB} MB
        </p>
      </div>

      {fileError && <p className="text-theme-xs font-medium text-danger">{fileError}</p>}

      {/* ── Selected file ── */}
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-theme-xs font-medium text-gray-800 dark:text-white/90 truncate">
              {file.name}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {formatSize(file.size)}
            </p>
            {isSubmitting && (
              <div className="mt-1.5 h-0.5 w-full rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}
          </div>

          {!isSubmitting && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-danger rounded transition-colors"
              aria-label={`Remove ${file.name}`}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-white/[0.05] pt-4 flex-wrap">
        <p className="text-theme-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Files go to validation queue before entering the system.
        </p>

        <div className="flex items-center gap-3">
          {submitted && tracking && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-theme-xs font-medium bg-success/10 text-success border border-success/20">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Submitted for validation
              </span>
              <button
                onClick={() => setShowQrModal(true)}
                className="text-theme-xs font-medium text-secondary underline underline-offset-2"
              >
                View QR
              </button>
            </span>
          )}

          <button
            onClick={handleSubmit}
            disabled={!file || isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-theme-sm font-medium bg-secondary text-white hover:bg-secondary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
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
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
            {isSubmitting ? "Submitting…" : "Submit for validation"}
          </button>
        </div>
      </div>

      {/* ── QR tracking modal ── */}
      {tracking && (
        <QRCodeModal
          open={showQrModal}
          onClose={() => setShowQrModal(false)}
          trackingId={tracking.id}
          trackingUrl={tracking.url}
          fileName={file?.name ?? ""}
        />
      )}
    </div>
  );
}
