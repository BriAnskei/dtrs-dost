import React from "react";
import type { DocumentType } from "./types";

interface DocumentTypeToggleProps {
  value: DocumentType;
  onChange: (type: DocumentType) => void;
}

export default function DocumentTypeToggle({ value, onChange }: DocumentTypeToggleProps) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-white/[0.05]">
      {(["incoming", "outgoing"] as DocumentType[]).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`
            flex items-center gap-2 rounded-lg px-5 py-2 text-theme-sm font-medium transition-all
            ${
              value === type
                ? "bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-secondary"
                : "text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-secondary"
            }
          `}
        >
          {type === "incoming" ? (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5V21"
              />
            </svg>
          )}
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
    </div>
  );
}
