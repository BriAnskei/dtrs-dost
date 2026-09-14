import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import MissingFieldsModal from "../ui/modal/document/MissingFieldsModal";

// ─── Types ─────────────────────────────────────────────────────────────

export interface InvalidDocument {
  id: string;
  fileName: string;
  from: string;
  uploaderName: string;
  createdAt: string;
  missingFields: string[];
  fileUrl: string;
  documentFileId: string;
  aiResponse: Record<string, string> | null;
  remarks: string | null;
  isMarkInvalid: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────

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

// ── Kebab Action Menu ─────────────────────────────────────────────────

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
  onMarkInvalid,
}: {
  onView: () => void;
  onMarkInvalid: () => void;
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
              onMarkInvalid();
            }}
            className="text-theme-xs text-danger hover:bg-danger/5 dark:text-danger flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 transition-colors dark:border-white/[0.05]"
          >
            Mark as Invalid
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export default function InvalidDocumentsTable() {
  const [search, setSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [data, setData] = useState<InvalidDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [showMarkInvalidConfirm, setShowMarkInvalidConfirm] = useState(false);
  const [pendingMarkInvalidId, setPendingMarkInvalidId] = useState<string | null>(null);
  const [markInvalidReason, setMarkInvalidReason] = useState("");
  const [markInvalidReasonError, setMarkInvalidReasonError] = useState(false);
  const [markingInvalid, setMarkingInvalid] = useState(false);

  // Missing Fields modal state
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [activeRecord, setActiveRecord] = useState<InvalidDocument | null>(null);

  const navigate = useNavigate();

  const hasFilters = search || filterDateFrom || filterDateTo;

  // Fetch invalid documents from API
  useEffect(() => {
    async function fetchData() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await axios.get<{ data: InvalidDocument[]; total: number }>(
          `${apiUrl}/invalid-documents`,
        );
        setData(response.data.data);
      } catch (error) {
        console.error("Failed to fetch invalid documents:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function handleOpenFieldsModal(record: InvalidDocument) {
    setActiveRecord(record);
    setShowFieldsModal(true);
  }

  function handleCloseFieldsModal() {
    setShowFieldsModal(false);
    setActiveRecord(null);
  }

  async function handleMarkInvalidConfirm() {
    if (pendingMarkInvalidId === null) return;

    if (!markInvalidReason.trim()) {
      setMarkInvalidReasonError(true);
      return;
    }

    setMarkingInvalid(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      await axios.patch(
        `${apiUrl}/invalid-documents/${pendingMarkInvalidId}/mark-invalid`,
      );

      // Remove the marked-invalid item from local state
      setData((prev) => prev.filter((r) => r.id !== pendingMarkInvalidId));
      setShowMarkInvalidConfirm(false);
      setPendingMarkInvalidId(null);
      setMarkInvalidReason("");
      setMarkInvalidReasonError(false);
    } catch (error) {
      console.error("Failed to mark document as invalid:", error);
    } finally {
      setMarkingInvalid(false);
    }
  }

  function handleMarkInvalidClick(id: string) {
    setShowFieldsModal(false);
    setActiveRecord(null);
    setMarkInvalidReason("");
    setMarkInvalidReasonError(false);
    setPendingMarkInvalidId(id);
    setShowMarkInvalidConfirm(true);
  }

  function handleProcess(id: string) {
    const record = data.find((r) => r.id === id);
    setShowFieldsModal(false);
    setActiveRecord(null);
    if (!record) return;
    navigate("/upload-direct", { state: { invalidDocument: record } });
  }

  const filtered = data.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.fileName.toLowerCase().includes(q);
    const date = new Date(r.createdAt);
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
          {loading ? (
            <div className="text-theme-sm rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.03]">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-theme-sm rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-gray-400 dark:border-white/[0.08] dark:bg-white/[0.03]">
              No invalid documents match your filters.
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
                  <span className="text-danger text-[10px] font-semibold">
                    {record.missingFields.length} missing
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div>
                    <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                      Uploaded By
                    </p>
                    <p className="text-theme-xs mt-0.5 text-gray-700 dark:text-gray-300">
                      {record.uploaderName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                      Uploaded At
                    </p>
                    <p className="text-theme-xs mt-0.5 text-gray-700 dark:text-gray-300">
                      {formatDateTime(record.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 dark:border-white/[0.05]">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenFieldsModal(record)}
                      className="text-theme-xs text-secondary border-secondary/30 hover:bg-secondary inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors duration-150 hover:text-white"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Review
                    </button>
                    <button
                      onClick={() => handleMarkInvalidClick(record.id)}
                      className="text-theme-xs text-danger border-danger/30 hover:bg-danger inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors duration-150 hover:text-white"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Mark as Invalid
                    </button>
                  </div>
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
                {data.length}
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
                  {[
                    "File Name",
                    "Uploader",
                    "Missing Field",
                    "Uploaded At",
                    "Actions",
                  ].map((col) => (
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
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-theme-sm px-5 py-10 text-center text-gray-400"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-theme-sm px-5 py-10 text-center text-gray-400"
                    >
                      No invalid documents match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((record) => (
                    <TableRow
                      key={record.id}
                      className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    >
                      <TableCell className="text-theme-sm px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                        {record.fileName}
                      </TableCell>

                      <TableCell className="text-theme-sm px-3 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {record.uploaderName || "—"}
                      </TableCell>

                      <TableCell className="text-theme-sm text-danger dark:text-danger px-3 py-3 text-left font-semibold">
                        {record.missingFields.length}
                      </TableCell>

                      <TableCell className="text-theme-sm px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {formatDateTime(record.createdAt)}
                      </TableCell>

                      <TableCell className="px-3 py-3">
                        <KebabActionMenu
                          onView={() => handleOpenFieldsModal(record)}
                          onMarkInvalid={() => handleMarkInvalidClick(record.id)}
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
                  {data.length}
                </span>{" "}
                records
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Missing Fields Modal ── */}
      <MissingFieldsModal
        document={activeRecord}
        isOpen={showFieldsModal}
        onClose={handleCloseFieldsModal}
        onMarkInvalid={handleMarkInvalidClick}
        onProcess={handleProcess}
      />

      {/* ── Mark as Invalid Confirm Modal ── */}
      {showMarkInvalidConfirm && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 px-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowMarkInvalidConfirm(false)
          }
        >
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900">
            <div className="px-6 py-5">
              <div className="bg-danger/10 dark:bg-danger/20 mb-4 flex h-11 w-11 items-center justify-center rounded-full">
                <svg
                  className="text-danger h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-white/90">
                Mark document as invalid?
              </h2>
              <p className="text-theme-xs mt-1.5 leading-relaxed text-gray-500 dark:text-gray-400">
                This will mark the document as invalid and return it to the receiver. The
                receiver will be notified and can fix the missing metadata and re-upload.
              </p>

              <div className="mt-4">
                <label className="text-theme-xs mb-1.5 block font-medium text-gray-600 dark:text-gray-300">
                  Reason for marking invalid <span className="text-danger">*</span>
                </label>
                <textarea
                  value={markInvalidReason}
                  onChange={(e) => {
                    setMarkInvalidReason(e.target.value);
                    if (e.target.value.trim()) setMarkInvalidReasonError(false);
                  }}
                  rows={3}
                  placeholder="e.g. Missing subject line and date received — please resubmit with complete details."
                  className={`text-theme-sm w-full resize-none rounded-lg border px-3 py-2 text-gray-700 transition focus:ring-2 focus:outline-none dark:bg-white/[0.03] dark:text-gray-200 ${
                    markInvalidReasonError
                      ? "border-danger focus:border-danger focus:ring-danger/30"
                      : "focus:border-secondary focus:ring-secondary/40 border-gray-200 dark:border-white/[0.08]"
                  }`}
                />
                {markInvalidReasonError && (
                  <p className="text-theme-xs text-danger mt-1">
                    A reason is required to mark this document as invalid.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-white/[0.05]">
              <button
                onClick={() => {
                  setShowMarkInvalidConfirm(false);
                  setPendingMarkInvalidId(null);
                  setMarkInvalidReason("");
                  setMarkInvalidReasonError(false);
                }}
                className="text-theme-sm rounded-lg border border-gray-200 px-3 py-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkInvalidConfirm}
                disabled={markingInvalid}
                className="text-theme-sm bg-danger hover:bg-danger/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-white transition-colors disabled:opacity-50"
              >
                {markingInvalid ? "Marking Invalid…" : "Mark as Invalid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
