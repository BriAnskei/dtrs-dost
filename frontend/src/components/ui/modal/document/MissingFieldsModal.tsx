// ─── Field Requirements ─────────────────────────────────────────────────
import { InvalidDocument } from "../../../tables/InvalidDocumentsTable";

const REQUIRED_FIELDS = [
  { label: "Subject", key: "subject" },
  { label: "From", key: "from" },
  { label: "To", key: "to" },
  { label: "Date Received", key: "date_received" },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────
function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getSummary(record: InvalidDocument): string {
  const missing = record.missingFields;
  const missingList =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  return `Missing ${missingList} — the document was flagged invalid because ${
    missing.length > 1 ? "these fields are" : "this field is"
  } required before it can be routed.`;
}

function isFieldMissing(record: InvalidDocument, key: string) {
  return record.missingFields.includes(key);
}

// ─── Icons ──────────────────────────────────────────────────────────────
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────
interface MissingFieldsModalProps {
  document: InvalidDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkInvalid: (id: string) => void;
  onProcess: (id: string) => void;
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function MissingFieldsModal({
  document: record,
  isOpen,
  onClose,
  onMarkInvalid,
  onProcess,
}: MissingFieldsModalProps) {
  if (!isOpen || !record) return null;

  const missingCount = record.missingFields.length;

  function handleViewDocument() {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    window.open(`${apiUrl}${record!.fileUrl}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-5 dark:border-white/[0.05]">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 dark:bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <DocumentIcon className="text-primary h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-theme-sm truncate font-semibold text-gray-900 dark:text-white/90">
                {record.fileName}
              </h2>
              <p className="text-theme-xs mt-0.5 text-gray-500 dark:text-gray-400">
                From {record.from} · {formatDateTime(record.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.08] dark:hover:text-gray-300"
            title="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5">
          {/* Summary */}
          <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-theme-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {getSummary(record)}
            </p>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Required Fields
            </p>
            <span className="bg-danger/10 text-danger inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
              {missingCount} missing
            </span>
          </div>

          <ul className="space-y-2">
            {REQUIRED_FIELDS.map(({ label, key }) => {
              const missing = isFieldMissing(record, key);
              return (
                <li
                  key={key}
                  className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                    missing
                      ? "border-danger/20 bg-danger/5 dark:border-danger/20 dark:bg-danger/10"
                      : "border-success/20 bg-success/5 dark:border-success/20 dark:bg-success/10"
                  }`}
                >
                  <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-200">
                    {label}
                  </span>
                  <span
                    className={`text-theme-xs inline-flex items-center gap-1 font-semibold ${
                      missing ? "text-danger" : "text-success"
                    }`}
                  >
                    {missing ? (
                      <>
                        <XIcon className="h-3.5 w-3.5" />
                        Missing
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-3.5 w-3.5" />
                        Present
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            onClick={handleViewDocument}
            className="text-theme-sm mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] px-3.5 py-2.5 font-medium text-[#475569] transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            View Document
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-white/[0.05]">
          <button
            onClick={onClose}
            className="text-theme-sm rounded-lg border border-gray-200 px-3 py-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            onClick={() => onMarkInvalid(record.id)}
            className="text-theme-sm border-danger/30 text-danger hover:bg-danger/5 dark:border-danger/30 dark:hover:bg-danger/10 rounded-lg border px-3 py-2 font-medium transition-colors"
          >
            Mark as Invalid
          </button>
          <button
            onClick={() => onProcess(record.id)}
            className="text-theme-sm bg-primary hover:bg-primary/90 rounded-lg px-3 py-2 font-medium text-white transition-colors"
          >
            Process Document
          </button>
        </div>
      </div>
    </div>
  );
}
