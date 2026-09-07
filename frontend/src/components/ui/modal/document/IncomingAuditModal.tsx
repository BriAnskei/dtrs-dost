import { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "created"
  | "status_changed"
  | "re_routed"
  | "routed"
  | "file_viewed"
  | "updated"
  | "archived"
  | "deleted";

export interface AuditLog {
  audit_id: string;
  document_id: string;
  action: AuditAction;
  performed_by: string;
  performed_at: string; // ISO 8601
  ip_address: string;
  previous_state: Record<string, string> | null;
  new_state: Record<string, string> | null;
  change_summary: string;
  metadata: Record<string, string> | null;
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentCode: string;
  documentSubject: string;
}

// ─── Mock Data Factory ────────────────────────────────────────────────────────

function getMockAuditLogs(documentCode: string): AuditLog[] {
  const allLogs: Record<string, AuditLog[]> = {
    "INC-2024-001": [
      {
        audit_id: "AUD-0005",
        document_id: "INC-2024-001",
        action: "status_changed",
        performed_by: "Maria Santos",
        performed_at: "2024-02-05T14:22:00Z",
        ip_address: "10.0.0.15",
        previous_state: { status: "On-Going" },
        new_state: { status: "Completed" },
        change_summary: "Status updated from On-Going to Completed",
        metadata: {
          reason: "Budget approved and signed off by Executive Office",
        },
      },
      {
        audit_id: "AUD-0004",
        document_id: "INC-2024-001",
        action: "status_changed",
        performed_by: "Maria Santos",
        performed_at: "2024-01-22T09:10:00Z",
        ip_address: "10.0.0.15",
        previous_state: { status: "Pending" },
        new_state: { status: "On-Going" },
        change_summary: "Status updated from Pending to On-Going",
        metadata: null,
      },
      {
        audit_id: "AUD-0003",
        document_id: "INC-2024-001",
        action: "file_viewed",
        performed_by: "Maria Santos",
        performed_at: "2024-01-12T11:45:00Z",
        ip_address: "10.0.0.15",
        previous_state: null,
        new_state: null,
        change_summary: "File opened: budget-proposal-2024.pdf",
        metadata: { file: "budget-proposal-2024.pdf" },
      },
      {
        audit_id: "AUD-0002",
        document_id: "INC-2024-001",
        action: "routed",
        performed_by: "System",
        performed_at: "2024-01-10T08:30:00Z",
        ip_address: "127.0.0.1",
        previous_state: null,
        new_state: { routed_to: "Maria Santos" },
        change_summary: "Document auto-routed to Maria Santos on receipt",
        metadata: { rule: "finance-to-exec" },
      },
      {
        audit_id: "AUD-0001",
        document_id: "INC-2024-001",
        action: "created",
        performed_by: "Ana Reyes",
        performed_at: "2024-01-10T08:00:00Z",
        ip_address: "192.168.1.10",
        previous_state: null,
        new_state: { status: "Pending" },
        change_summary: "Document received and registered",
        metadata: null,
      },
    ],
    "INC-2024-002": [
      {
        audit_id: "AUD-0006",
        document_id: "INC-2024-002",
        action: "status_changed",
        performed_by: "Juan dela Cruz",
        performed_at: "2024-06-26T10:42:00Z",
        ip_address: "192.168.1.42",
        previous_state: { status: "On-Going" },
        new_state: { status: "Completed" },
        change_summary: "Status updated from On-Going to Completed",
        metadata: { reason: "Maintenance work completed and verified" },
      },
      {
        audit_id: "AUD-0005",
        document_id: "INC-2024-002",
        action: "re_routed",
        performed_by: "Maria Santos",
        performed_at: "2024-06-24T14:15:00Z",
        ip_address: "10.0.0.15",
        previous_state: { routed_to: "Maria Santos" },
        new_state: { routed_to: "Juan dela Cruz" },
        change_summary: "Re-routed from Maria Santos to Juan dela Cruz",
        metadata: { reason: "Assigned to field operations lead" },
      },
      {
        audit_id: "AUD-0004",
        document_id: "INC-2024-002",
        action: "status_changed",
        performed_by: "Maria Santos",
        performed_at: "2024-01-20T09:08:00Z",
        ip_address: "10.0.0.15",
        previous_state: { status: "Pending" },
        new_state: { status: "On-Going" },
        change_summary: "Status updated from Pending to On-Going",
        metadata: null,
      },
      {
        audit_id: "AUD-0003",
        document_id: "INC-2024-002",
        action: "file_viewed",
        performed_by: "Ramon Garcia",
        performed_at: "2024-01-15T15:50:00Z",
        ip_address: "172.16.0.9",
        previous_state: null,
        new_state: null,
        change_summary: "File opened: maintenance-request.pdf",
        metadata: { file: "maintenance-request.pdf" },
      },
      {
        audit_id: "AUD-0002",
        document_id: "INC-2024-002",
        action: "routed",
        performed_by: "System",
        performed_at: "2024-01-14T11:30:00Z",
        ip_address: "127.0.0.1",
        previous_state: null,
        new_state: { routed_to: "Maria Santos" },
        change_summary: "Document auto-routed to Maria Santos on receipt",
        metadata: { rule: "facilities-to-ops" },
      },
      {
        audit_id: "AUD-0001",
        document_id: "INC-2024-002",
        action: "created",
        performed_by: "Ana Reyes",
        performed_at: "2024-01-14T08:00:00Z",
        ip_address: "192.168.1.10",
        previous_state: null,
        new_state: { status: "Pending" },
        change_summary: "Document received and registered",
        metadata: null,
      },
    ],
  };

  // Generic fallback for any other document code
  return (
    allLogs[documentCode] ?? [
      {
        audit_id: "AUD-0002",
        document_id: documentCode,
        action: "routed",
        performed_by: "System",
        performed_at: new Date().toISOString(),
        ip_address: "127.0.0.1",
        previous_state: null,
        new_state: { routed_to: "Assigned User" },
        change_summary: "Document auto-routed on receipt",
        metadata: null,
      },
      {
        audit_id: "AUD-0001",
        document_id: documentCode,
        action: "created",
        performed_by: "System",
        performed_at: new Date().toISOString(),
        ip_address: "127.0.0.1",
        previous_state: null,
        new_state: { status: "Pending" },
        change_summary: "Document received and registered",
        metadata: null,
      },
    ]
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; dotClass: string; badgeClass: string }
> = {
  created: {
    label: "Created",
    dotClass: "bg-blue-100 border-blue-400",
    badgeClass: "text-blue-700",
  },
  status_changed: {
    label: "Status changed",
    dotClass: "bg-pink-100 border-pink-400",
    badgeClass: "text-pink-700",
  },
  re_routed: {
    label: "Re-routed",
    dotClass: "bg-amber-100 border-amber-400",
    badgeClass: "text-amber-700",
  },
  routed: {
    label: "Routed",
    dotClass: "bg-amber-100 border-amber-400",
    badgeClass: "text-amber-700",
  },
  file_viewed: {
    label: "File viewed",
    dotClass: "bg-gray-100 border-gray-400",
    badgeClass: "text-gray-600",
  },
  updated: {
    label: "Updated",
    dotClass: "bg-green-100 border-green-500",
    badgeClass: "text-green-700",
  },
  archived: {
    label: "Archived",
    dotClass: "bg-gray-100 border-gray-400",
    badgeClass: "text-gray-600",
  },
  deleted: {
    label: "Deleted",
    dotClass: "bg-red-100 border-red-400",
    badgeClass: "text-red-600",
  },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StateDiff({
  prev,
  next,
}: {
  prev: Record<string, string> | null;
  next: Record<string, string> | null;
}) {
  if (!prev && !next) return null;

  const keys = Array.from(
    new Set([...Object.keys(prev ?? {}), ...Object.keys(next ?? {})]),
  );

  return (
    <div className="mt-2 flex flex-col gap-1">
      {keys.map((key) => {
        const from = prev?.[key];
        const to = next?.[key];
        if (!from && !to) return null;
        return (
          <div key={key} className="flex items-center gap-2 flex-wrap">
            <span className="text-theme-xs text-gray-400 capitalize">
              {key.replace(/_/g, " ")}:
            </span>
            {from && (
              <span className="font-mono text-theme-xs bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                {from}
              </span>
            )}
            {from && to && <span className="text-gray-400 text-theme-xs">→</span>}
            {to && (
              <span className="font-mono text-theme-xs bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                {to}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuditEntry({ log, isLast }: { log: AuditLog; isLast: boolean }) {
  const cfg = ACTION_CONFIG[log.action];

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 mt-1.5 ${cfg.dotClass}`}
        />
        {!isLast && <div className="w-px flex-1 bg-gray-200 dark:bg-white/[0.08] mt-1" />}
      </div>

      {/* Card */}
      <div
        className={`flex-1 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-lg p-3 ${
          isLast ? "mb-0" : "mb-3"
        }`}
      >
        {/* Top row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className={`text-theme-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeClass}`}
          >
            {cfg.label}
          </span>
          <span className="text-theme-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {formatDateTime(log.performed_at)}
          </span>
        </div>

        {/* Summary */}
        <p className="text-theme-sm text-gray-700 dark:text-gray-300 mt-2 leading-snug">
          {log.change_summary}
        </p>

        {/* State diff */}
        <StateDiff prev={log.previous_state} next={log.new_state} />

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-gray-200 dark:border-white/[0.06]">
          <span className="flex items-center gap-1 text-theme-xs text-gray-400 dark:text-gray-500">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              {log.performed_by}
            </span>
          </span>
          <span className="flex items-center gap-1 text-theme-xs text-gray-400 dark:text-gray-500">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <span className="font-mono">{log.ip_address}</span>
          </span>
          <span className="flex items-center gap-1 text-theme-xs text-gray-400 dark:text-gray-500 ml-auto">
            <span className="font-mono">{log.audit_id}</span>
          </span>
        </div>

        {/* Metadata */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(log.metadata).map(([k, v]) => (
              <span
                key={k}
                className="text-theme-xs bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded"
              >
                <span className="text-gray-400 capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function IncomingAuditModal({
  isOpen,
  onClose,
  documentCode,
  documentSubject,
}: AuditLogModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const logs = getMockAuditLogs(documentCode);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Close on backdrop click
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.08] w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0">
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90 flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Audit log
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              <span className="font-mono font-semibold text-primary dark:text-secondary">
                {documentCode}
              </span>
              {" · "}
              {documentSubject}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 transition-colors focus:outline-none flex-shrink-0"
            title="Close"
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
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {logs.length === 0 ? (
            <p className="text-center text-gray-400 text-theme-sm py-10">
              No audit entries found.
            </p>
          ) : (
            logs.map((log, idx) => (
              <AuditEntry key={log.audit_id} log={log} isLast={idx === logs.length - 1} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between flex-shrink-0">
          <span className="text-theme-xs text-gray-400 dark:text-gray-500">
            {logs.length} event{logs.length !== 1 ? "s" : ""} &nbsp;·&nbsp; {documentCode}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
