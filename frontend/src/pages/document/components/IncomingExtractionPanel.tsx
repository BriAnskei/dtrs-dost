import React from "react";
import ReactMarkdown from "react-markdown";
import EmptyState from "./EmptyState";
import Field from "./Field";
import FieldSkeleton from "./FieldSkeleton";
import SectionDivider from "./SectionDivider";
import type { ExtractionStatus, IncomingMetadata } from "./types";

interface Props {
  status: ExtractionStatus;
  metadata: IncomingMetadata;
  hasFile: boolean;
  onFieldChange: (field: keyof IncomingMetadata, value: string) => void;
}

export default function IncomingExtractionPanel({
  status,
  metadata,
  hasFile,
  onFieldChange,
}: Props) {
  // const isExtracting = status === "extracting";
  //  const isReady = status === "done";

  const isExtracting = false;
  const isReady = true;

  return (
    <div
      className="flex flex-col gap-4"
      style={hasFile ? { height: "640px" } : undefined}
    >
      {/* Header */}
      <div className="shrink-0">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Document Details
        </h2>
        <p className="text-theme-xs mt-0.5 text-gray-400 dark:text-gray-500">
          {isExtracting
            ? "Reading the document…"
            : isReady
              ? "Review extracted fields and fill in the required inputs."
              : "Upload a PDF to extract metadata."}
        </p>
      </div>

      {isExtracting && (
        <div className="border-secondary/30 bg-secondary/5 dark:border-secondary/20 dark:bg-secondary/10 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="bg-secondary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span className="bg-secondary relative inline-flex h-2 w-2 rounded-full" />
          </span>
          <span className="text-theme-xs text-secondary dark:text-secondary font-medium">
            Extracting metadata…
          </span>
        </div>
      )}

      {/* Fields */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4">
          {isExtracting ? (
            Array.from({ length: 6 }, (_, i) => <FieldSkeleton key={i} />)
          ) : isReady ? (
            <>
              <SectionDivider label="System" />
              <Field
                label="ID Code"
                value={metadata.idCode}
                placeholder="YYYY-DD-#"
                systemGenerated
                onChange={(v: string) => onFieldChange("idCode", v)}
              />

              <SectionDivider label="Extracted from document" />
              <Field
                label="Subject"
                value={metadata.subject}
                placeholder="e.g. Memorandum on Budget Allocation"
                onChange={(v: string) => onFieldChange("subject", v)}
              />
              <Field
                label="From"
                value={metadata.from}
                placeholder="e.g. Office of the Director"
                onChange={(v: string) => onFieldChange("from", v)}
              />
              <Field
                label="To"
                value={metadata.to}
                placeholder="e.g. Finance Division"
                onChange={(v: string) => onFieldChange("to", v)}
              />
              <Field
                label="Date Received"
                value={metadata.dateReceived}
                placeholder=""
                type="datetime-local"
                onChange={(v: string) => onFieldChange("dateReceived", v)}
              />

              {/* Summary — AI-generated, read-only */}
              <div className="flex flex-col gap-1.5">
                <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">
                  Summary
                </span>
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  {/* Card header */}
                  <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                    </svg>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      AI-generated summary
                    </span>
                    <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-600">
                      Read-only
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="px-3 py-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                    {metadata.summary ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-gray-900 dark:text-white">
                              {children}
                            </strong>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>
                          ),
                          li: ({ children }) => <li className="mb-0.5">{children}</li>,
                        }}
                      >
                        {metadata.summary}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-600">
                        No summary extracted.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <SectionDivider label="Requires input" />
              <Field
                label="Routed To"
                value={metadata.routedTo}
                placeholder="e.g. Records Section"
                onChange={(v: string) => onFieldChange("routedTo", v)}
              />
              <Field
                label="Notice of Action"
                value={metadata.noticeOfAction}
                placeholder="Instructions given by PE…"
                textarea
                onChange={(v: string) => onFieldChange("noticeOfAction", v)}
              />
              <Field
                label="Action Taken"
                value={metadata.actionTaken}
                placeholder="Personnel/Division action…"
                textarea
                onChange={(v: string) => onFieldChange("actionTaken", v)}
              />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Save button */}
      {isReady && (
        <div className="shrink-0 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            className="bg-[#2563eb] text-theme-sm hover:bg-[#2563eb]/90 focus:ring-[#2563eb]/30 w-full rounded-xl px-4 py-2.5 font-semibold text-white shadow-sm transition focus:ring-2 focus:outline-none active:scale-[0.98]"
          >
            Save Document
          </button>
        </div>
      )}
    </div>
  );
}
