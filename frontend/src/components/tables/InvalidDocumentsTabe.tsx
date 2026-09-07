import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";

// ─── Types ─────────────────────────────────────────────────────────────

interface RejectedDocument {
  id: number;
  fileName: string;
  from: string;
  uploadedAt: string;
  missingFields: string[];
  fileUrl: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────

const mockData: RejectedDocument[] = [
  {
    id: 1,
    fileName: "memo-budget-allocation.pdf",
    from: "Barangay Hall",
    uploadedAt: "2024-01-10T09:14:00",
    missingFields: ["Subject", "Date Received"],
    fileUrl: "/files/doc-001.pdf",
  },
  {
    id: 2,
    fileName: "construction-proposal.pdf",
    from: "Engineering Division",
    uploadedAt: "2024-01-14T14:30:00",
    missingFields: ["To"],
    fileUrl: "/files/doc-002.pdf",
  },
  {
    id: 3,
    fileName: "inspection-report.pdf",
    from: "City Mayor's Office",
    uploadedAt: "2024-01-18T11:05:00",
    missingFields: ["Subject", "From", "Date Received"],
    fileUrl: "/files/doc-003.pdf",
  },
  {
    id: 4,
    fileName: "fund-release-order.pdf",
    from: "Treasury Office",
    uploadedAt: "2024-01-22T08:47:00",
    missingFields: ["To", "Date Received"],
    fileUrl: "/files/doc-004.pdf",
  },
  {
    id: 5,
    fileName: "permit-application.pdf",
    from: "Planning Office",
    uploadedAt: "2024-01-25T16:20:00",
    missingFields: ["Subject"],
    fileUrl: "/files/doc-005.pdf",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

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

// ── Kebab Action Menu ───────────────────────────────────────────────────

function KebabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="4" r="1.75" />
      <circle cx="10" cy="10" r="1.75" />
      <circle cx="10" cy="16" r="1.75" />
    </svg>
  );
}

function KebabActionMenu({
  onView,
  onDelete,
}: {
  onView: () => void;
  onDelete: () => void;
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
              onView();
            }}
            className="text-theme-xs flex w-full items-center gap-2 px-3 py-2 text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            View
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="text-theme-xs flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-danger transition-colors hover:bg-danger/5 dark:border-white/[0.05] dark:text-danger"
          >
            Delete Draft
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function InvalidDocumentsTable() {
  const [search, setSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  const navigate = useNavigate();

  const hasFilters = search || filterDateFrom || filterDateTo;

  // Only show documents that haven't been deleted
  const activeData = mockData.filter((r) => !deletedIds.includes(r.id));

  function handleDeleteConfirm() {
    if (pendingDeleteId === null) return;
    setDeletedIds((prev) => [...prev, pendingDeleteId]);
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);
  }

  function handleDeleteCancel() {
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);
  }

  const filtered = activeData.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.fileName.toLowerCase().includes(q);
    const date = new Date(r.uploadedAt);
    const matchesFrom = !filterDateFrom || date >= new Date(filterDateFrom);
    const matchesTo = !filterDateTo || date <= new Date(filterDateTo);
    return matchesSearch && matchesFrom && matchesTo;
  });

  // ── Shared class strings ──
  const inputCls =
    "px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition";

  const labelCls = "text-theme-xs text-gray-500 dark:text-gray-400 font-medium";

  return (
    <>
      <div className="space-y-4">
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

          {/* Date filters + Clear */}
          <div className="flex flex-wrap items-end gap-3">
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
                onClick={() => {
                  setSearch("");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                }}
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
              No rejected documents match your filters.
            </div>
          ) : (
            filtered.map((record) => (
              <div
                key={record.id}
                className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between">
                  <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                    {record.fileName}
                  </p>
                  <span className="text-[10px] font-semibold text-danger">
                    {record.missingFields.length}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div>
                    <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                      Uploaded At
                    </p>
                    <p className="text-theme-xs mt-0.5 text-gray-700 dark:text-gray-300">
                      {formatDateTime(record.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-1 dark:border-white/[0.05]">
                  <KebabActionMenu
                    onView={() => navigate("/upload-direct")}
                    onDelete={() => {
                      setPendingDeleteId(record.id);
                      setShowDeleteConfirm(true);
                    }}
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
                {activeData.length}
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
                  {["Missing Field", "Uploaded At", "Actions"].map((col) => (
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
                      colSpan={3}
                      className="text-theme-sm px-5 py-10 text-center text-gray-400"
                    >
                      No rejected documents match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((record) => (
                    <TableRow
                      key={record.id}
                      className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    >
                      <TableCell className="text-theme-sm px-3 py-3 text-left font-semibold text-danger dark:text-danger">
                        {record.missingFields.length}
                      </TableCell>

                      <TableCell className="text-theme-sm px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {formatDateTime(record.uploadedAt)}
                      </TableCell>

                      <TableCell className="px-3 py-3">
                        <KebabActionMenu
                          onView={() => navigate("/upload-direct")}
                          onDelete={() => {
                            setPendingDeleteId(record.id);
                            setShowDeleteConfirm(true);
                          }}
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
                  {activeData.length}
                </span>{" "}
                records
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Draft Confirm Modal ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => e.target === e.currentTarget && handleDeleteCancel()}
        >
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900">
            <div className="px-6 py-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 dark:bg-danger/20">
                <svg
                  className="h-5 w-5 text-danger"
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
              </div>

              <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-white/90">
                Delete draft?
              </h2>
              <p className="text-theme-xs mt-1.5 leading-relaxed text-gray-500 dark:text-gray-400">
                This will permanently remove the rejected document from your submissions.
                You can re-upload it later if needed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-white/[0.05]">
              <button
                onClick={handleDeleteCancel}
                className="text-theme-sm rounded-lg border border-gray-200 px-3 py-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="text-theme-sm inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-2 font-medium text-white transition-colors hover:bg-danger/90"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
