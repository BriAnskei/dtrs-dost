import { useEffect, useRef, useState } from "react";
import Badge from "../../badge/Badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusType = "Completed" | "On-Going" | "Pending";

export interface StatusUpdatePayload {
  newStatus: StatusType;
  reason?: string;
}

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: StatusUpdatePayload) => void;
  currentStatus: StatusType;
  documentCode: string;
  documentSubject: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_STATUSES: StatusType[] = ["Completed", "On-Going", "Pending"];

const STATUS_ORDER: Record<StatusType, number> = {
  Pending: 0,
  "On-Going": 1,
  Completed: 2,
};

function isRollback(from: StatusType, to: StatusType): boolean {
  return STATUS_ORDER[to] < STATUS_ORDER[from];
}

function getBadgeColor(status: StatusType) {
  if (status === "Completed") return "success";
  if (status === "On-Going") return "warning";
  return "error";
}

const STATUS_META: Record<
  StatusType,
  { label: string; dot: string; ring: string; text: string }
> = {
  Completed: {
    label: "Completed",
    dot: "bg-success",
    ring: "ring-success/20",
    text: "text-success",
  },
  "On-Going": {
    label: "On-Going",
    dot: "bg-warning",
    ring: "ring-warning/20",
    text: "text-warning",
  },
  Pending: {
    label: "Pending",
    dot: "bg-danger",
    ring: "ring-danger/20",
    text: "text-danger",
  },
};

// ─── Arrow Icon ───────────────────────────────────────────────────────────────

function ArrowRightIcon() {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ─── Warning Icon ─────────────────────────────────────────────────────────────

function WarningIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

// ─── StatusUpdateModal ────────────────────────────────────────────────────────

export default function StatusUpdateModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  documentCode,
  documentSubject,
}: StatusUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(currentStatus);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const rollback = isRollback(currentStatus, selectedStatus);
  const unchanged = selectedStatus === currentStatus;

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(currentStatus);
      setReason("");
      setReasonError(false);
    }
  }, [isOpen, currentStatus]);

  // Focus textarea when rollback is detected
  useEffect(() => {
    if (rollback && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [rollback]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleConfirm() {
    if (rollback && !reason.trim()) {
      setReasonError(true);
      textareaRef.current?.focus();
      return;
    }
    onConfirm({
      newStatus: selectedStatus,
      reason: rollback ? reason.trim() : undefined,
    });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-gray-900">
        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 pt-6 pb-4 dark:border-white/[0.08]">
          <div className="space-y-1 pr-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Update Document Status
            </h2>
            <p className="text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
              <span className="text-primary dark:text-secondary font-mono font-semibold">
                {documentCode}
              </span>{" "}
              &mdash; <span className="truncate">{documentSubject}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
            aria-label="Close modal"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="space-y-5 px-6 py-5">
          {/* Current → New status preview */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex items-center gap-1.5">
              <span className="text-theme-xs font-medium text-gray-400 dark:text-gray-500">
                Current
              </span>
              <Badge size="sm" color={getBadgeColor(currentStatus)}>
                {currentStatus}
              </Badge>
            </div>
            <ArrowRightIcon />
            <div className="flex items-center gap-1.5">
              <span className="text-theme-xs font-medium text-gray-400 dark:text-gray-500">
                New
              </span>
              {unchanged ? (
                <span className="text-theme-xs text-gray-400 italic dark:text-gray-500">
                  no change
                </span>
              ) : (
                <Badge size="sm" color={getBadgeColor(selectedStatus)}>
                  {selectedStatus}
                </Badge>
              )}
            </div>
          </div>

          {/* Status selector */}
          <div className="space-y-2">
            <label className="text-theme-xs block font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
              Select New Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_STATUSES.map((s) => {
                const meta = STATUS_META[s];
                const isSelected = selectedStatus === s;
                const isCurrent = currentStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setSelectedStatus(s);
                      setReasonError(false);
                      if (!isRollback(currentStatus, s)) setReason("");
                    }}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-left transition-all duration-150 focus:outline-none ${
                      isSelected
                        ? `border-primary dark:border-secondary bg-primary/5 dark:bg-secondary/10 ring-primary/10 dark:ring-secondary/20 ring-2`
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${meta.dot} ${isSelected ? "ring-4 " + meta.ring : ""} transition-all`}
                    />
                    <span
                      className={`text-theme-xs text-center leading-tight font-semibold ${
                        isSelected
                          ? "text-primary dark:text-secondary"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {meta.label}
                    </span>
                    {isCurrent && (
                      <span className="absolute top-1.5 right-1.5 rounded bg-gray-100 px-1 text-[9px] font-semibold tracking-wide text-gray-400 uppercase dark:bg-white/[0.06] dark:text-gray-500">
                        current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rollback warning + remarks */}
          {rollback && (
            <div className="space-y-3">
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <WarningIcon />
                <p className="text-theme-xs leading-relaxed text-amber-700 dark:text-amber-400">
                  You are rolling back the status from{" "}
                  <span className="font-semibold">{currentStatus}</span> to{" "}
                  <span className="font-semibold">{selectedStatus}</span>. Remarks are
                  required for audit purposes.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-theme-xs block font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                  Remarks{" "}
                  <span className="text-danger font-normal tracking-normal normal-case">
                    *required
                  </span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (e.target.value.trim()) setReasonError(false);
                  }}
                  rows={3}
                  placeholder="Briefly describe why this status is being rolled back…"
                  className={`text-theme-sm w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-gray-700 placeholder-gray-400 transition focus:outline-none dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500 ${
                    reasonError
                      ? "border-danger ring-danger/20 focus:border-danger focus:ring-danger/30 ring-2"
                      : "focus:ring-secondary/40 focus:border-secondary border-gray-200 focus:ring-2 dark:border-white/[0.08]"
                  }`}
                />
                {reasonError && (
                  <p className="text-theme-xs text-danger">
                    Please provide remarks before confirming.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-6 pt-2 pb-6">
          <button
            onClick={onClose}
            className="text-theme-sm rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus:outline-none dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={unchanged}
            className={`text-theme-sm rounded-lg px-4 py-2 font-semibold transition-colors focus:outline-none ${
              unchanged
                ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-gray-500"
                : "bg-primary hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white shadow-sm"
            }`}
          >
            Confirm Update
          </button>
        </div>
      </div>
    </div>
  );
}
