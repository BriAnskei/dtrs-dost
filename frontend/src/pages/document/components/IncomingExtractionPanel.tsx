import ReactMarkdown from "react-markdown";
import Field from "./Field";
import FieldSkeleton from "./FieldSkeleton";
import SectionDivider from "./SectionDivider";
import EmptyState from "./EmptyState";
import DivisionMultiSelect from "./DivisionMultiSelect";
import type { ExtractionStatus, IncomingMetadata } from "./types";

interface Props {
  status: ExtractionStatus;
  metadata: IncomingMetadata;
  hasFile: boolean;
  onFieldChange: <K extends keyof IncomingMetadata>(field: K, value: IncomingMetadata[K]) => void;
  onSave?: () => void;
  saving?: boolean;
}
export default function IncomingExtractionPanel({
  status,
  metadata,
  hasFile,
  onFieldChange,
  onSave,
  saving = false,
}: Props) {
  const isExtracting = status === "extracting";
  const isReady = status === "done";

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
          <span className="text-theme-xs text-secondary/60 dark:text-secondary/40 ml-auto">
            Fields remain editable
          </span>
        </div>
      )}

      {/* Fields */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4">
          {isExtracting ? (
            <>
              <SectionDivider label="Extracted from document" />
              <Field
                label="Subject"
                value={metadata.subject}
                placeholder="e.g. Memorandum on Budget Allocation"
                loading={true}
                onChange={(v: string) => onFieldChange("subject", v)}
              />
              <Field
                label="From"
                value={metadata.from}
                placeholder="e.g. Office of the Director"
                loading={true}
                onChange={(v: string) => onFieldChange("from", v)}
              />
              <Field
                label="To"
                value={metadata.to}
                placeholder="e.g. Finance Division"
                loading={true}
                onChange={(v: string) => onFieldChange("to", v)}
              />
              <Field
                label="Date Received"
                value={metadata.dateReceived}
                placeholder=""
                type="datetime-local"
                loading={true}
                onChange={(v: string) => onFieldChange("dateReceived", v)}
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">
                  Summary
                </span>
                <div className="px-3 py-3">
                  <textarea
                    value={metadata.summary ?? ""}
                    onChange={(e) => onFieldChange("summary", e.target.value)}
                    placeholder="No summary extracted. You can write one here."
                    rows={5}
                    className="text-theme-sm w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 focus:outline-none dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder:text-gray-600"
                  />
                </div>
              </div>

              <SectionDivider label="Requires input" />
              <DivisionMultiSelect
                label="Routed To"
                value={metadata.routedTo}
                onChange={(divisions) => onFieldChange("routedTo", divisions)}
              />
              <Field
                label="Notice of Action"
                value={metadata.noticeOfAction}
                placeholder="Instructions given by PE…"
                textarea
                loading={true}
                onChange={(v: string) => onFieldChange("noticeOfAction", v)}
              />
              <Field
                label="Action Taken"
                value={metadata.actionTaken}
                placeholder="Personnel/Division action…"
                textarea
                loading={true}
                onChange={(v: string) => onFieldChange("actionTaken", v)}
              />
            </>
          ) : isReady ? (
            <>
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

              <div className="flex flex-col gap-1.5">
                <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">
                  Summary
                </span>

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

              <SectionDivider label="Requires input" />
              <DivisionMultiSelect
                label="Routed To"
                value={metadata.routedTo}
                onChange={(divisions) => onFieldChange("routedTo", divisions)}
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
      {(isReady || isExtracting) && (
        <div className="shrink-0 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !onSave}
            className="text-theme-sm w-full rounded-xl bg-[#2563eb] px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[#2563eb]/90 focus:ring-2 focus:ring-[#2563eb]/30 focus:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Document"}
          </button>
        </div>
      )}
    </div>
  );
}
