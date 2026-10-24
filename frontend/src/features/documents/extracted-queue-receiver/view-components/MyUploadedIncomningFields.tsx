import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { formatDate } from "../../../../utils/dateFormatter";
import { CONFIDENCE_THRESHOLDS } from "../../extraction/receiver/receiver-upload-constants";
import type { ReceiverExtractedField } from "../../extraction/receiver/types/reciever-upload-api-types";
import type { MyExtractedDocumentQueue } from "../types/extracted-queue-receiver-types";
import type { IncomingDocumentDetailsDto } from "../types/get-incoming-document-by-queue.dto";
import MyUploadedConfidenceMeter from "./MyUploadedConfidenceMeter";

type IncomingKey = "subject" | "from" | "to" | "date_received" | "summary";

interface FieldRow {
  key: IncomingKey;
  /** The `field` value of the matching extracted field (typed, so a wrong key fails to compile). */
  extractionKey: ReceiverExtractedField["field"];
  label: string;
  kind: "text" | "date";
  wide?: boolean;
}

const ROWS: FieldRow[] = [
  {
    key: "subject",
    extractionKey: "subject",
    label: "Subject",
    kind: "text",
    wide: true,
  },
  { key: "from", extractionKey: "from", label: "From", kind: "text" },
  { key: "to", extractionKey: "to", label: "To", kind: "text" },
  {
    key: "date_received",
    extractionKey: "dateReceived",
    label: "Date received",
    kind: "date",
  },
  {
    key: "summary",
    extractionKey: "summary",
    label: "Summary",
    kind: "text",
    wide: true,
  },
];

type Change = "edited" | "filled" | null;

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-01-08..." or "January 8, 2026" -> "2026-01-08" (null if it can't be read). */
function toDateKey(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function getChange(
  kind: FieldRow["kind"],
  finalValue: string,
  extracted: string | null,
): Change {
  const hasFinal = !!finalValue?.trim();
  const hasExtracted = !!extracted?.trim();

  if (!hasFinal) return null;
  if (!hasExtracted) return "filled";

  if (kind === "date") {
    const a = toDateKey(finalValue);
    const b = toDateKey(extracted as string);
    // If either side can't be read, don't claim an edit.
    return a && b && a !== b ? "edited" : null;
  }

  return normalizeText(finalValue) !== normalizeText(extracted as string)
    ? "edited"
    : null;
}

const CHANGE_LABEL: Record<Exclude<Change, null>, string> = {
  edited: "Edited by admin",
  filled: "Filled in by admin",
};

interface Props {
  data: IncomingDocumentDetailsDto;
  item: MyExtractedDocumentQueue;
}

/**
 * The final incoming values, one per field. Each field can reveal what the AI
 * originally extracted for it, plus the confidence behind that value.
 */
export default function MyUploadedIncomingFields({ data, item }: Props) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<IncomingKey>>(new Set());

  const allOpen = open.size === ROWS.length;

  function toggleOne(key: IncomingKey) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setOpen(allOpen ? new Set() : new Set(ROWS.map((row) => row.key)));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1 text-theme-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90 transition-colors"
        >
          {allOpen ? "Hide all AI extraction" : "Show all AI extraction"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {ROWS.map((row) => {
          const finalRaw = data[row.key];
          const finalDisplay = row.kind === "date" ? formatDate(finalRaw) : finalRaw;

          const extractedField = item.fields.find((f) => f.field === row.extractionKey);
          const extractedValue = extractedField?.value ?? null;
          const change = getChange(row.kind, finalRaw, extractedValue);

          const isOpen = open.has(row.key);
          const panelId = `${baseId}-${row.key}`;

          return (
            <div key={row.key} className={`min-w-0 ${row.wide ? "sm:col-span-2" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {row.label}
                    {change && (
                      <span className="ml-2 text-warning-700 dark:text-warning-400">
                        · {CHANGE_LABEL[change]}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-theme-sm text-gray-800 dark:text-white/90">
                    {finalDisplay}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleOne(row.key)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={`${isOpen ? "Hide" : "Show"} AI extraction for ${row.label}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-theme-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white/90 transition-colors"
                >
                  AI extraction
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div
                id={panelId}
                hidden={!isOpen}
                className="mt-2 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/3"
              >
                <div>
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    Extracted by AI
                  </p>
                  {extractedValue?.trim() ? (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-theme-sm text-gray-800 dark:text-white/90">
                      {extractedValue}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-theme-sm italic text-gray-400 dark:text-gray-500">
                      Not found
                    </p>
                  )}
                </div>

                {extractedField && (
                  <div className="max-w-xs">
                    <MyUploadedConfidenceMeter field={extractedField} align="left" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open.size > 0 && (
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          The percentage is the effective confidence (source and AI combined). Values
          below {CONFIDENCE_THRESHOLDS.medium}% are shown in red.
        </p>
      )}
    </div>
  );
}
