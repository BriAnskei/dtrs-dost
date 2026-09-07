import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ACCEPTED_FILE_TYPES } from "./constants";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
}

export default function DropZone({ onFileDrop }: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFileDrop(accepted[0]);
    },
    [onFileDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        flex cursor-pointer flex-col items-center justify-center gap-3
        rounded-xl border-2 border-dashed px-6 py-16 transition-colors
        ${
          isDragActive
            ? "border-secondary bg-secondary/5 dark:bg-secondary/10"
            : "border-gray-300 bg-gray-50 hover:border-secondary/60 hover:bg-gray-100 dark:border-gray-700 dark:bg-white/[0.03] dark:hover:border-secondary/50"
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
        <svg
          className="h-6 w-6 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
          {isDragActive ? "Drop your PDF here" : "Drag & drop your PDF here"}
        </p>
        <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          or{" "}
          <span className="font-medium text-secondary underline-offset-2 hover:underline">
            click to browse
          </span>{" "}
          · PDF only
        </p>
      </div>
    </div>
  );
}
