// ─── PublicTrackingPage.tsx ────────────────────────────────────────────────
// Public, read-only page for clients who scan the QR code / open the
// tracking link generated after a receiver uploads an incoming document.
//
// No auth, no sidebar — matches the visual language of the SignIn/AuthLayout
// pages (bg-background, primary/secondary/success colors, CompanyLogo).
//
// Currently renders hardcoded MOCK_RECORD regardless of the URL. Once
// routing is wired up (react-router-dom), swap this for something like:
//
//   import { useParams } from "react-router";
//   const { trackingId } = useParams();
//   const record = await fetchTrackingRecord(trackingId); // real API call
//
// and drop MOCK_RECORD.

import { useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import CompanyLogo from "../../components/logo/CompanyLogo";

// ── Types ────────────────────────────────────────────────

// "on-queue"  -> receiver just uploaded, waiting for admin/super admin to route it
// "received"  -> logged / received at the front desk after routing
// "pending"   -> awaiting assignment to the concerned engineering division
// "on-going"  -> actively being worked on
// "completed" -> finished
//
// Any of these can be rolled back to an earlier stage by an admin/super admin.
// Because rollbacks exist, a stage can appear more than once in the history,
// so history is a true chronological event log rather than a fixed 4-step
// tracker.
type Stage = "on-queue" | "received" | "pending" | "on-going" | "completed";

interface HistoryEntry {
  id: string;
  stage: Stage;
  date: string;
  note: string;
  /** True if this entry is a rollback to an earlier stage rather than normal forward progress. */
  isRollback?: boolean;
  /** Remarks left by the admin/super admin who performed the rollback. Shown publicly. */
  remarks?: string;
}

interface TrackingRecord {
  trackingId: string;
  subject: string;
  dateReceived: string;
  lastUpdated: string;
  summary: string;
  /** Ordered oldest → newest. The last entry represents the current status. */
  history: HistoryEntry[];
}

// ── Mock data ────────────────────────────────────────────

const MOCK_RECORD: TrackingRecord = {
  trackingId: "DOC-7F3K9QZ2XY",
  subject: "Request for Road Repair — Barangay San Miguel",
  dateReceived: "July 10, 2026",
  lastUpdated: "July 17, 2026",
  summary:
    "Formal request submitted by the Barangay San Miguel council for repair of a damaged road section along Purok 3, citing recurring flooding and vehicle accidents during the rainy season.",
  history: [
    {
      id: "h1",
      stage: "on-queue",
      date: "July 9, 2026, 4:50 PM",
      note: "Document uploaded by receiver, awaiting routing by admin.",
    },
    {
      id: "h2",
      stage: "received",
      date: "July 10, 2026, 9:14 AM",
      note: "Document received and logged at the PEO front desk.",
    },
    {
      id: "h3",
      stage: "pending",
      date: "July 11, 2026, 2:30 PM",
      note: "Awaiting assignment to the concerned engineering division.",
    },
    {
      id: "h4",
      stage: "on-going",
      date: "July 14, 2026, 10:05 AM",
      note: "Under review by the Roads & Bridges section.",
    },
    {
      id: "h5",
      stage: "completed",
      date: "July 16, 2026, 3:00 PM",
      note: "Review completed and endorsed for approval.",
    },
    {
      id: "h6",
      stage: "on-going",
      date: "July 17, 2026, 9:20 AM",
      isRollback: true,
      note: "Status rolled back to On-Going by admin.",
      remarks:
        "Additional documentation required from the requesting barangay before final endorsement can proceed.",
    },
  ],
};

const STAGE_LABEL: Record<Stage, string> = {
  "on-queue": "On Queue",
  received: "Received",
  pending: "Pending",
  "on-going": "On-Going",
  completed: "Completed",
};

const STAGE_BADGE_CLS: Record<Stage, string> = {
  "on-queue": "text-indigo-600",
  received: "text-gray-600",
  pending: "text-orange-600",
  "on-going": "text-secondary",
  completed: "text-success",
};

// ── Icons ────────────────────────────────────────────────
// Stage-specific icons (instead of a uniform checkmark) so the timeline reads
// at a glance, the way a shipment/order tracker does. All non-rollback nodes
// share one neutral color — the icon shape carries the meaning, not color.

function InboxIcon() {
  return (
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
        d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.012 1.244h3.218a2.25 2.25 0 002.012-1.244l.256-.512a2.25 2.25 0 012.012-1.244h3.86M2.25 13.5V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.5M2.25 13.5l1.263-8.213A2.25 2.25 0 015.736 3.5h12.528a2.25 2.25 0 012.223 1.787L21.75 13.5"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25a2.25 2.25 0 00-2.25 2.25v15a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
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
        d="M12 6.75v5.25l3.75 2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
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
        d="M16.023 9.348h4.992v-4.99M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function RollbackIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15L4.5 10.5M4.5 10.5L9 6M4.5 10.5h9a5.25 5.25 0 010 10.5h-1.5"
      />
    </svg>
  );
}

const STAGE_ICON: Record<Stage, () => JSX.Element> = {
  "on-queue": InboxIcon,
  received: DocumentIcon,
  pending: ClockIcon,
  "on-going": RefreshIcon,
  completed: CheckIcon,
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

// ── Small components ─────────────────────────────────────

function StatusBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`text-theme-xs inline-flex items-center gap-1.5 font-medium ${STAGE_BADGE_CLS[stage]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STAGE_LABEL[stage]}
    </span>
  );
}

// Full chronological timeline. Because rollbacks exist, entries are rendered
// in the order they happened rather than mapped against a fixed stage index —
// the same stage can appear more than once. All stage nodes share one neutral
// color; only rollback entries stand out, in orange.
function StatusHistory({ entries }: { entries: HistoryEntry[] }) {
  const lastIndex = entries.length - 1;

  return (
    <ol className="space-y-0">
      {entries.map((entry, idx) => {
        const isCurrent = idx === lastIndex;
        const isLast = idx === lastIndex;
        const Icon = STAGE_ICON[entry.stage];

        const nodeCls = entry.isRollback
          ? "border-orange-400 text-orange-500"
          : "border-gray-300 text-gray-500";

        return (
          <li key={entry.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* connecting line */}
            {!isLast && (
              <span
                className={`absolute top-8 left-[15px] h-[calc(100%-1.5rem)] w-px ${
                  entry.isRollback ? "bg-orange-300" : "bg-gray-200"
                }`}
              />
            )}

            {/* node */}
            <span
              className={`relative z-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white ${nodeCls} ${
                isCurrent ? "ring-secondary/50 ring-2 ring-offset-2" : ""
              }`}
            >
              {entry.isRollback ? <RollbackIcon /> : <Icon />}
            </span>

            {/* content */}
            <div className="pt-0.5">
              <p className="text-theme-sm font-semibold text-gray-800">
                {entry.isRollback ? "Rolled Back to " : ""}
                {STAGE_LABEL[entry.stage]}
                {isCurrent && (
                  <span
                    className={`ml-2 text-[11px] font-medium tracking-wide uppercase ${
                      entry.isRollback ? "text-orange-500" : "text-secondary"
                    }`}
                  >
                    Current
                  </span>
                )}
              </p>
              <p className="text-theme-xs mt-0.5 text-gray-400">{entry.date}</p>
              <p className="text-theme-xs mt-1 max-w-md text-gray-500">{entry.note}</p>

              {entry.remarks && (
                <div className="mt-2 max-w-md rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                  <p className="text-[11px] font-medium tracking-wide text-orange-600 uppercase">
                    Remarks
                  </p>
                  <p className="text-theme-xs mt-0.5 text-orange-700">{entry.remarks}</p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Page ─────────────────────────────────────────────────

export default function PublicTrackingPage() {
  const record = MOCK_RECORD;
  const currentStage = record.history[record.history.length - 1].stage;
  const [expanded, setExpanded] = useState(false);

  const visibleEntries = expanded
    ? record.history
    : [record.history[record.history.length - 1]];

  return (
    <>
      <PageMeta
        title={`Track ${record.trackingId} | Document Tracking System`}
        description="Public document status tracking for the Provincial Engineering Office."
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="flex items-center border-b border-gray-100 bg-white px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <CompanyLogo size={36} />
            <div className="leading-tight">
              <p className="text-theme-sm font-semibold text-gray-800">
                Document Tracking System
              </p>
              <p className="text-[11px] text-gray-400">Provincial Engineering Office</p>
            </div>
          </Link>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-2xl px-4 py-10">
          <div className="shadow-theme-xs rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
            {/* Top: code + status */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                  Document Code
                </p>
                <p className="text-theme-lg mt-0.5 font-mono font-semibold text-gray-800">
                  {record.trackingId}
                </p>
              </div>
              <StatusBadge stage={currentStage} />
            </div>

            <div className="mt-5 border-t border-gray-100 pt-5">
              <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                Subject
              </p>
              <p className="text-theme-md mt-1 font-medium text-gray-800">
                {record.subject}
              </p>
            </div>

            {/* Dates */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                  Date Received
                </p>
                <p className="text-theme-sm mt-0.5 font-medium text-gray-700">
                  {record.dateReceived}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                  Last Updated
                </p>
                <p className="text-theme-sm mt-0.5 font-medium text-gray-700">
                  {record.lastUpdated}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                Summary
              </p>
              <p className="text-theme-sm mt-1.5 text-gray-600">{record.summary}</p>
            </div>

            {/* Status history — shows latest entry by default, full timeline on demand */}
            <div className="mt-7 border-t border-gray-100 pt-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                  Status History
                </p>
                {record.history.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="text-theme-xs text-secondary hover:text-secondary/80 flex items-center gap-1 font-medium"
                  >
                    {expanded ? "Show Less" : "View All"}
                    <ChevronIcon open={expanded} />
                  </button>
                )}
              </div>
              <StatusHistory entries={visibleEntries} />
            </div>
          </div>

          <p className="text-theme-xs mt-4 text-center text-gray-400">
            This is a read-only tracking view. For concerns regarding this document,
            please contact the Provincial Engineering Office.
          </p>
        </main>
      </div>
    </>
  );
}
