import { useRef, useState } from "react";
import { MAX_FILE_MB } from "../constans";
import { formatBytes } from "../helpers/extraction-helpers";

interface Props {
  file: File | null;
  onSelect: (f: File | null) => void;
  disabled?: boolean;
}

export default function PdfDropzone({ file, onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (f?: File) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are allowed.");
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be ${MAX_FILE_MB} MB or smaller.`);
      return;
    }
    setError(null);
    onSelect(f);
  };

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-white/3">
        <div className="min-w-0">
          <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {file.name}
          </p>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500">
            PDF · {formatBytes(file.size)}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(null)}
          className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/8 dark:text-gray-400"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
          dragging
            ? "border-secondary bg-secondary/5"
            : "border-gray-300 hover:border-secondary/60 dark:border-white/10"
        }`}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
          />
        </svg>
        <p className="text-theme-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium text-secondary">Click to upload</span> or drag and
          drop
        </p>
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          PDF only, up to {MAX_FILE_MB} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-theme-xs text-danger">{error}</p>}
    </div>
  );
}
