// ─── MyUploadsTable.tsx ───────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Table, TableHeader, TableRow, TableCell, TableBody } from "../../../components/ui/table";
import QRCodeModal from "../../../components/receiver/QRCodeModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStatus = "on-queue" | "received" | "archived" | "rejected";

interface UploadedDocument {
  id: string;
  fileName: string;
  from: string;
  uploadedAt: string;
  status: UploadStatus;
}

interface QueueApiRecord {
  id: string;
  fileName: string;
  from: string;
  uploadedAt: string;
  status: "on-queue" | "received";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Mock tracking-info generator — replace with a real API call once
// a tracking system / backend endpoint exists.
function buildTrackingInfo(record: UploadedDocument) {
  const trackingId = `DOC-${record.id.slice(0, 8).toUpperCase()}`;
  const trackingUrl = `${window.location.origin}/document/track`;
  return { trackingId, trackingUrl };
}

type StatusConfigEntry = { label: string; className: string };

const STATUS_CONFIG: Record<UploadStatus, StatusConfigEntry> = {
  "on-queue": { label: "On-Queue", className: "text-warning font-medium" },
  received: { label: "Received", className: "text-success font-medium" },
  archived: { label: "Archived", className: "text-gray-400 font-medium" },
  rejected: { label: "Rejected", className: "text-danger font-medium" },
};

function StatusBadge({ status }: { status: UploadStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span
      className={`text-theme-xs inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${className}`}
    >
      {label}
    </span>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArchiveIcon({ className }: { className?: string }) {
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
        d="M20 7H4a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 10v8a1 1 0 001 1h12a1 1 0 001-1v-8"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14h4" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
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
        d="M8.684 13.342a4 4 0 100 2.316m6.632-8.974a4 4 0 100-2.316m0 2.316L8.684 13.342m6.632 4.974a4 4 0 100-2.316m0 2.316L8.684 15.658m9.316-9.632a4 4 0 11-8 0 4 4 0 018 0zm0 12a4 4 0 11-8 0 4 4 0 018 0zM7 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function KebabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="4" r="1.75" />
      <circle cx="10" cy="10" r="1.75" />
      <circle cx="10" cy="16" r="1.75" />
    </svg>
  );
}

// ─── Archive Confirm Modal ────────────────────────────────────────────────────

function ArchiveConfirmModal({
  file,
  onConfirm,
  onCancel,
}: {
  file: UploadedDocument;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900">
        <div className="px-6 py-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.06]">
            <ArchiveIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </div>

          <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-white/90">
            Archive document?
          </h2>
          <p className="text-theme-xs mt-1.5 leading-relaxed text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{file.fileName}</span>{" "}
            will be moved to the archive. You can restore it later if needed.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-white/[0.05]">
          <button
            onClick={onCancel}
            className="text-theme-sm rounded-lg border border-gray-200 px-3 py-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-theme-sm inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-2 font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white/[0.10] dark:hover:bg-white/[0.15]"
          >
            <ArchiveIcon className="h-4 w-4" />
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kebab Action Menu ────────────────────────────────────────────────────────

function KebabActionMenu({
  onArchive,
  onShare,
  disabled,
}: {
  onArchive: () => void;
  onShare: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (disabled) {
    return <span className="text-theme-xs text-gray-300 italic dark:text-gray-600">Archived</span>;
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.08]"
        title="Actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <KebabIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 origin-top-right overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/[0.08] dark:bg-gray-900">
          <button
            onClick={() => {
              setOpen(false);
              onShare();
            }}
            className="text-theme-xs flex w-full items-center gap-2 px-3 py-2 text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            <ShareIcon className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onArchive();
            }}
            className="text-theme-xs flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            <ArchiveIcon className="h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UploadedIncomingDocTable() {
  const [records, setRecords] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<UploadStatus | "">("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [pendingArchive, setPendingArchive] = useState<UploadedDocument | null>(null);
  const [shareTarget, setShareTarget] = useState<UploadedDocument | null>(null);

  // ── Fetch queue from backend ──

  useEffect(() => {
    let cancelled = false;

    async function fetchQueue() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await axios.get<QueueApiRecord[]>(`${apiUrl}/upload/queue`);
        if (!cancelled) {
          setRecords(response.data);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error("Failed to fetch queue documents:", error);
          setFetchError(error?.response?.data?.message || "Failed to load uploaded documents.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchQueue();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Filtering ──

  const hasFilters = search || filterStatus || filterDateFrom || filterDateTo;

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.fileName.toLowerCase().includes(q);
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const date = new Date(r.uploadedAt);
    const matchesFrom = !filterDateFrom || date >= new Date(filterDateFrom);
    const matchesTo = !filterDateTo || date <= new Date(filterDateTo);
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });

  function clearFilters() {
    setSearch("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  // ── Archive ──

  function confirmArchive() {
    if (!pendingArchive) return;
    setRecords((prev) =>
      prev.map((r) => (r.id === pendingArchive.id ? { ...r, status: "archived" } : r)),
    );
    setPendingArchive(null);
  }

  // ── Share ──

  function handleShare(record: UploadedDocument) {
    setShareTarget(record);
  }

  const shareInfo = shareTarget ? buildTrackingInfo(shareTarget) : null;

  // ── Shared class strings ──

  const inputCls =
    "px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition";

  const labelCls = "text-theme-xs text-gray-500 dark:text-gray-400 font-medium";

  return (
    <>
      {pendingArchive && (
        <ArchiveConfirmModal
          file={pendingArchive}
          onConfirm={confirmArchive}
          onCancel={() => setPendingArchive(null)}
        />
      )}

      {shareTarget && shareInfo && (
        <QRCodeModal
          open={!!shareTarget}
          onClose={() => setShareTarget(null)}
          trackingId={shareInfo.trackingId}
          trackingUrl={shareInfo.trackingUrl}
          fileName={shareTarget.fileName}
        />
      )}

      <div className="space-y-4">
        {/* ── Loading state ── */}
        {isLoading && (
          <div className="text-theme-sm rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.03]">
            Loading uploaded documents…
          </div>
        )}

        {/* ── Error state ── */}
        {fetchError && !isLoading && (
          <div className="border-danger/20 bg-danger/5 text-theme-xs text-danger rounded-lg border px-3 py-2">
            ⚠️ {fetchError}
          </div>
        )}

        {!isLoading && !fetchError && (
          <>
            {/* ── Filters ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              {/* Search */}
              <div className="relative w-full sm:min-w-[200px] sm:flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
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
                      d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by file name…"
                  className={`w-full pr-4 pl-9 ${inputCls}`}
                />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                {/* Status filter */}
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as UploadStatus | "")}
                    className={inputCls}
                  >
                    <option value="">All statuses</option>
                    <option value="on-queue">On-Queue</option>
                    <option value="received">Received</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Date From */}
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>From</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Date To */}
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>To</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Clear */}
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-theme-sm hover:text-danger hover:border-danger/40 dark:hover:text-danger rounded-lg border border-gray-200 px-3 py-2 whitespace-nowrap text-gray-500 transition-colors dark:border-white/[0.08] dark:text-gray-400"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* ── Mobile Cards (< md) ── */}
            <div className="space-y-3 md:hidden">
              {filtered.length === 0 ? (
                <div className="text-theme-sm rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.03]">
                  No records match your filters.
                </div>
              ) : (
                filtered.map((record) => (
                  <div
                    key={record.id}
                    className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-theme-sm font-semibold break-all text-gray-800 dark:text-white/90">
                        {record.fileName}
                      </p>
                      <StatusBadge status={record.status} />
                    </div>

                    <div>
                      <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                        From
                      </p>
                      <p className="text-theme-xs mt-0.5 text-gray-700 dark:text-gray-300">
                        {record.from}
                      </p>
                    </div>

                    <div>
                      <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                        Uploaded At
                      </p>
                      <p className="text-theme-xs mt-0.5 text-gray-700 dark:text-gray-300">
                        {formatDateTime(record.uploadedAt)}
                      </p>
                    </div>

                    <div className="flex justify-end border-t border-gray-100 pt-1 dark:border-white/[0.05]">
                      <KebabActionMenu
                        onArchive={() => setPendingArchive(record)}
                        onShare={() => handleShare(record)}
                        disabled={record.status === "archived"}
                      />
                    </div>
                  </div>
                ))
              )}

              {filtered.length > 0 && (
                <p className="text-theme-xs px-1 text-right text-gray-400 dark:text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {filtered.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {records.length}
                  </span>{" "}
                  records
                </p>
              )}
            </div>

            {/* ── Desktop Table (≥ md) ── */}
            <div className="hidden rounded-xl border border-gray-200 bg-white md:block dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="dark:border-white/[0.05]">
                    <TableRow>
                      {["File Name", "From", "Uploaded At", "Status", "Action"].map((col) => (
                        <TableCell
                          key={col}
                          isHeader
                          className="text-primary text-theme-xs px-3 py-3 text-start font-semibold whitespace-nowrap dark:text-gray-300"
                        >
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody className="dark:divide-white/[0.05]">
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-theme-sm px-5 py-10 text-center text-gray-400"
                        >
                          No records match your filters.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((record) => (
                        <TableRow
                          key={record.id}
                          className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                        >
                          {/* File name */}
                          <TableCell className="text-theme-sm px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 flex-shrink-0 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                />
                              </svg>
                              {record.fileName}
                            </div>
                          </TableCell>

                          {/* From */}
                          <TableCell className="text-theme-sm px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {record.from}
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-theme-sm px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {formatDateTime(record.uploadedAt)}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="px-3 py-3">
                            <StatusBadge status={record.status} />
                          </TableCell>

                          {/* Action */}
                          <TableCell className="px-3 py-3">
                            <KebabActionMenu
                              onArchive={() => setPendingArchive(record)}
                              onShare={() => handleShare(record)}
                              disabled={record.status === "archived"}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {filtered.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 dark:border-white/[0.05]">
                  <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                    Showing{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {filtered.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {records.length}
                    </span>{" "}
                    records
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
