// ─── IncomingDocumentForm.tsx ──────────────────────────────────────────
// Receiver upload form with client-side PDF text extraction and
// backend AI field extraction.

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import axios from "axios";
import QRCodeModal from "../../../components/receiver/QRCodeModal";
import { userUser } from "../../../context/UserContext";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

const ACCEPTED = ".pdf";
const MAX_MB = 20;

// ── Types ────────────────────────────────────────────────

interface UploadResult {
  success: boolean;
  fileId: string;
  queueId?: string;
  invalidDocId?: string;
  missingFields?: string[];
  message: string;
}

// ── Component ─────────────────────────────────────────────

export default function IncomingDocumentForm() {
  const { userId } = userUser();

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tracking, setTracking] = useState<{ id: string; url: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<
    "idle" | "extracting" | "ai-processing" | "done" | "error"
  >("idle");
  const [extractionMessage, setExtractionMessage] = useState<string>("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
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
    setExtractionStatus("idle");
    setExtractionMessage("");
    setMissingFields([]);
  }

  function removeFile() {
    setFile(null);
    setFileError(null);
    setSubmitted(false);
    setProgress(0);
    setTracking(null);
    setExtractionStatus("idle");
    setExtractionMessage("");
    setMissingFields([]);
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

  // ── PDF text extraction ──

  const extractPdfText = async (pdfFile: File): Promise<string> => {
    try {
      const arrBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrBuffer }).promise;
      let text = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += `\n\n--- PAGE ${pageNum} ---\n${pageText}`;
      }
      return text;
    } catch (error) {
      console.error("PDF text extraction error:", error);
      return "";
    }
  };

  const extractOcr = async (pdfFile: File): Promise<string> => {
    try {
      const arrBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrBuffer }).promise;
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, canvas, viewport }).promise;
        const image = canvas.toDataURL("image/png");
        const result = await Tesseract.recognize(image, "eng", {
          logger: (m) => console.log(m),
        });
        fullText += `\n\n--- PAGE ${pageNum} ---\n` + result.data.text;
      }
      return fullText;
    } catch (error) {
      console.error("OCR extraction error:", error);
      return "";
    }
  };

  // ── Submit ──

  async function handleSubmit() {
    if (!file || isSubmitting) return;
    if (!userId) {
      setExtractionStatus("error");
      setExtractionMessage("You must be signed in to upload a document.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    setProgress(0);
    setExtractionStatus("extracting");
    setExtractionMessage("Extracting text from PDF…");

    try {
      // Step 1: Extract text from PDF
      let text = await extractPdfText(file);

      if (!text || text.trim().length <= 50) {
        setExtractionMessage("Text too short — running OCR on scanned document…");
        setProgress(30);
        text = await extractOcr(file);
      }

      setExtractionStatus("ai-processing");
      setExtractionMessage("Sending document for AI field extraction…");
      setProgress(60);

      // Step 2: Send file + extracted text to backend
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentText", text || "");
      formData.append("uploaderId", userId || "");

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

      const response = await axios.post<UploadResult>(`${apiUrl}/upload/receiver`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) {
            const pct = Math.round((event.loaded / event.total) * 40) + 60;
            setProgress(Math.min(pct, 95));
          }
        },
      });

      setProgress(100);

      // Step 3: Handle response
      if (response.data.success) {
        setSubmitted(true);
        setExtractionStatus("done");
        setExtractionMessage(response.data.message);

        if (response.data.missingFields && response.data.missingFields.length > 0) {
          setMissingFields(response.data.missingFields);
        }

        if (response.data.queueId) {
          const id = `DOC-${response.data.queueId.slice(0, 8).toUpperCase()}`;
          const newTracking = {
            id,
            url: `${window.location.origin}/document/track`,
          };
          setTracking(newTracking);
          setShowQrModal(true);
        }
      } else {
        setExtractionStatus("error");
        setExtractionMessage(response.data.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setExtractionStatus("error");
      setExtractionMessage(error?.response?.data?.message || "An error occurred during upload");
    } finally {
      setIsSubmitting(false);
    }
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
            className="h-4 w-4 flex-shrink-0 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${
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
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
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

        <p className="text-theme-xs text-gray-400 dark:text-gray-500">PDF only — max {MAX_MB} MB</p>
      </div>

      {fileError && <p className="text-theme-xs text-danger font-medium">{fileError}</p>}

      {/* ── Selected file ── */}
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="bg-secondary/10 text-secondary flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md">
            <svg
              className="h-4 w-4"
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

          <div className="min-w-0 flex-1">
            <p className="text-theme-xs truncate font-medium text-gray-800 dark:text-white/90">
              {file.name}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
              {formatSize(file.size)}
            </p>
            {isSubmitting && (
              <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.08]">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
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
              className="hover:text-danger flex-shrink-0 rounded p-1 text-gray-400 transition-colors"
              aria-label={`Remove ${file.name}`}
            >
              <svg
                className="h-4 w-4"
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

      {/* ── Extraction status ── */}
      {extractionStatus !== "idle" && (
        <div className="text-theme-xs flex items-center gap-2 rounded-lg border px-3 py-2">
          {extractionStatus === "extracting" && (
            <span className="text-blue-600 dark:text-blue-400">📄 {extractionMessage}</span>
          )}
          {extractionStatus === "ai-processing" && (
            <span className="text-purple-600 dark:text-purple-400">🤖 {extractionMessage}</span>
          )}
          {extractionStatus === "done" && (
            <span className="text-success">✅ {extractionMessage}</span>
          )}
          {extractionStatus === "error" && (
            <span className="text-danger">❌ {extractionMessage}</span>
          )}
        </div>
      )}

      {/* ── Missing fields alert ── */}
      {missingFields.length > 0 && (
        <div className="border-danger/20 bg-danger/5 text-theme-xs text-danger rounded-lg border px-3 py-2">
          ⚠️ Missing fields detected:{" "}
          {missingFields.map((f) => (
            <span key={f} className="font-medium underline">
              {f}
            </span>
          ))}
          . The document has been flagged for review.
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
        <p className="text-theme-xs flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
          <svg
            className="h-3.5 w-3.5"
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
          Files are validated by AI before entering the system.
        </p>

        <div className="flex items-center gap-3">
          {submitted && tracking && (
            <span className="inline-flex items-center gap-2">
              <span className="text-theme-xs bg-success/10 text-success border-success/20 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium">
                <svg
                  className="h-3.5 w-3.5"
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
                {missingFields.length > 0 ? "Flagged — Missing Fields" : "Queued for Processing"}
              </span>
              <button
                onClick={() => setShowQrModal(true)}
                className="text-theme-xs text-secondary font-medium underline underline-offset-2"
              >
                View QR
              </button>
            </span>
          )}

          <button
            onClick={handleSubmit}
            disabled={!file || isSubmitting}
            className="text-theme-sm bg-secondary hover:bg-secondary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
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
            {isSubmitting ? "Processing…" : "Submit for Validation"}
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
