import { useState, useEffect, useRef } from "react";
import { Table, TableHeader, TableRow, TableCell, TableBody } from "../ui/table";
import axios from "axios";
import { userUser } from "../../context/UserContext";

// ─── Types ─────────────────────────────────────────────────────

export interface InvalidDocument {
  id: string;
  fileName: string;
  uploaderName: string;
  fileUrl: string;
  documentFileId: string;
  missingFields: string[];
  createdAt: string;
  isMarkInvalid: boolean;
  remarks?: string;
}

type StatusFilter = "all" | "invalid" | "incomplete";

// ─── Helpers ──────────────────────────────────────────────────

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

type Status = "invalid" | "on-review";

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  invalid: { label: "Marked Invalid", className: "text-danger" },
  "on-review": { label: "On Review", className: "text-warning" },
};

function getStatusKey(record: InvalidDocument): Status {
  return record.isMarkInvalid ? "invalid" : "on-review";
}

function StatusBadge({ record }: { record: InvalidDocument }) {
  const { label, className } = STATUS_CONFIG[getStatusKey(record)];
  return (
    <span
      className={`text-theme-xs inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${className}`}
    >
      {label}
    </span>
  );
}

// ─── Kebab Menu ───────────────────────────────────────────────
function KebabMenu({
  record,
  onView,
  onDelete,
}: {
  record: InvalidDocument;
  onView: () => void;
  onDelete: (record: InvalidDocument) => void;
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
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"
        aria-label="Actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 6a2 2 0 100-4 2 2 0 000 4zM12 14a2 2 0 100-4 2 2 0 000 4zM12 22a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-[999999] mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/[0.08] dark:bg-gray-900">
          <button
            onClick={() => {
              setOpen(false);
              onView();
            }}
            className="text-theme-xs block w-full px-4 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            View
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete(record);
            }}
            className="text-theme-xs text-danger hover:bg-danger/10 block w-full border-t border-gray-100 px-4 py-2 text-left transition-colors dark:border-white/[0.05] dark:hover:bg-white/[0.05]"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────

function DeleteConfirmModal({
  record,
  onClose,
  onConfirm,
  isDeleting,
  error,
}: {
  record: InvalidDocument;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  error: string | null;
}) {
  return (
    // NOTE: bumped from z-50 -> z-[999999] to match the pattern used
    // elsewhere in the app, guaranteeing it sits above any layout chrome.
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/[0.08] dark:bg-gray-900">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          Delete "{record.fileName}"?
        </h3>

        <div className="mt-3">
          <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
            Remarks
          </p>
          <p className="text-theme-sm mt-1 text-gray-600 dark:text-gray-300">
            {record.remarks && record.remarks.trim() ? record.remarks : "No remarks provided."}
          </p>
        </div>

        <p className="text-theme-xs mt-4 text-gray-400 dark:text-gray-500">
          This will permanently delete the document and its uploaded file. This action cannot be
          undone.
        </p>

        {error && <p className="text-theme-xs text-danger mt-2">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-theme-xs rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="text-theme-xs bg-danger hover:bg-danger/90 rounded-lg px-3 py-1.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function InvalidDocumentsTable() {
  const { userId } = userUser();
  const [search, setSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [data, setData] = useState<InvalidDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvalidDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const hasFilters = search || filterDateFrom || filterDateTo || statusFilter !== "all";

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      try {
        const response = await axios.get<{ data: InvalidDocument[]; total: number }>(
          `${apiUrl}/invalid-documents/receiver`,
        );
        setData(response.data.data);
      } catch (error) {
        console.error("Failed to fetch invalid documents:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  function openDeleteModal(record: InvalidDocument) {
    console.log("delete modal");
    setDeleteError(null);
    setDeleteTarget(record);
  }

  function closeDeleteModal() {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await axios.delete(`${apiUrl}/invalid-documents/${deleteTarget.id}`);
      setData((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
      setDeleteError("Failed to delete document. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filtered = data.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.fileName.toLowerCase().includes(q);
    const date = new Date(r.createdAt);
    const matchesFrom = !filterDateFrom || date >= new Date(filterDateFrom);
    const matchesTo = !filterDateTo || date <= new Date(filterDateTo);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "invalid" && r.isMarkInvalid) ||
      (statusFilter === "incomplete" && !r.isMarkInvalid);
    return matchesSearch && matchesFrom && matchesTo && matchesStatus;
  });

  const inputCls =
    "px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition";

  const labelCls = "text-theme-xs text-gray-500 dark:text-gray-400 font-medium";

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
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
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className={inputCls}
              >
                <option value="all">All</option>
                <option value="invalid">Marked Invalid</option>
                <option value="incomplete">On Review</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className={inputCls}
              />
            </div>

            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setStatusFilter("all");
                }}
                className="text-theme-sm hover:text-danger hover:border-danger/40 dark:hover:text-danger rounded-lg border border-gray-200 px-3 py-2 whitespace-nowrap text-gray-500 transition-colors dark:border-white/[0.08] dark:text-gray-400"
              >
                Clear
              </button>
            )}
          </div>
        </div>

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
            filtered.map((record) => {
              return (
                <div
                  key={record.id}
                  className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                      {record.fileName}
                    </p>
                    <KebabMenu
                      record={record}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      onDelete={openDeleteModal}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div>
                      <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                        Uploaded At
                      </p>
                      <p className="text-theme-xs mt-0.5 text-gray-700 dark:text-gray-300">
                        {formatDateTime(record.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                        Missing Fields
                      </p>
                      <p className="text-theme-xs text-danger dark:text-danger mt-0.5 font-medium">
                        {record.missingFields.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                        Status
                      </p>
                      <div className="mt-0.5">
                        <StatusBadge record={record} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {filtered.length > 0 && (
            <p className="text-theme-xs px-1 text-right text-gray-400 dark:text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {filtered.length}
              </span>{" "}
              of <span className="font-medium text-gray-600 dark:text-gray-300">{data.length}</span>{" "}
              records
            </p>
          )}
        </div>

        <div className="hidden rounded-xl border border-gray-200 bg-white md:block dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="dark:border-white/[0.05]">
                <TableRow>
                  {["File Name", "Uploaded At", "Missing Fields", "Status", "Action"].map((col) => (
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
                    <td colSpan={5} className="text-theme-sm px-5 py-10 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-theme-sm px-5 py-10 text-center text-gray-400">
                      No invalid documents match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((record) => {
                    return (
                      <TableRow
                        key={record.id}
                        className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                      >
                        <TableCell className="text-theme-sm px-3 py-3 font-medium whitespace-nowrap text-gray-800 dark:text-white/90">
                          {record.fileName}
                        </TableCell>

                        <TableCell className="text-theme-sm px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {formatDateTime(record.createdAt)}
                        </TableCell>

                        <TableCell className="text-theme-sm text-danger dark:text-danger px-3 py-3 text-left font-medium whitespace-nowrap">
                          {record.missingFields.length}
                        </TableCell>

                        <TableCell className="px-3 py-3">
                          <StatusBadge record={record} />
                        </TableCell>

                        <TableCell className="px-3 py-3">
                          <KebabMenu
                            record={record}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            onDelete={openDeleteModal}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
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
                <span className="font-medium text-gray-600 dark:text-gray-300">{data.length}</span>{" "}
                records
              </span>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          record={deleteTarget}
          onClose={closeDeleteModal}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </>
  );
}
