import { useState } from "react";
import KebabMenu, {
  UpdateStatusIcon,
  ViewIcon,
} from "../../ui/kebab-menu/KebabMenu";
import RoutedDivisionsModal from "../../ui/modal/document/RoutedDivisionsModal";
import StatusUpdateModal, {
  type StatusType,
  type StatusUpdatePayload,
} from "../../ui/modal/document/StatusUpdateModal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IncomingDocument {
  id: number;
  code: string;
  subject: string;
  from: string;
  to: string;
  routedDivisions: string[];
  status: StatusType;
  fileUrl: string;
  dateReceived: string;
}

type StatusFilter = StatusType | "All";

interface DivisionIncomingDocumentsTableProps {
  division: string;
  records: IncomingDocument[];
  onRecordsChange: (records: IncomingDocument[]) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_STATUSES: StatusType[] = ["Completed", "On-Going", "Pending"];

function StatusText({ status }: { status: StatusType }) {
  const colorClass =
    status === "Completed"
      ? "text-success"
      : status === "On-Going"
        ? "text-warning"
        : "text-danger";
  return <span className={`text-theme-xs font-semibold ${colorClass}`}>{status}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Routed Divisions Icon Button ────────────────────────────────────────────

function RoutedDivisionsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
      title="View / update routed divisions"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    </button>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function MobileCard({
  record,
  onView,
  onUpdateStatus,
  onViewFile,
  onViewRouted,
}: {
  record: IncomingDocument;
  onView: (r: IncomingDocument) => void;
  onUpdateStatus: (record: IncomingDocument) => void;
  onViewFile: (r: IncomingDocument) => void;
  onViewRouted: (r: IncomingDocument) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-theme-xs text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/10 rounded px-2 py-0.5 font-mono font-semibold">
          {record.code}
        </span>
        <KebabMenu
          actions={[
            { label: "View", icon: <ViewIcon />, handler: () => onView(record) },
            { label: "Update Status", icon: <UpdateStatusIcon />, handler: () => onUpdateStatus(record) },
          ]}
        />
      </div>

      <p className="text-theme-sm leading-snug font-semibold text-gray-800 dark:text-white/90">
        {record.subject}
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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
            To
          </p>
          <p className="text-theme-xs mt-0.5 text-gray-700 dark:text-gray-300">
            {record.to}
          </p>
        </div>
        <div>
          <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
            Routed To
          </p>
          <div className="mt-0.5">
            <RoutedDivisionsButton onClick={() => onViewRouted(record)} />
          </div>
        </div>
        <div>
          <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
            Date Received
          </p>
          <p className="text-theme-xs mt-0.5 text-gray-700 dark:text-gray-300">
            {formatDate(record.dateReceived)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-1 dark:border-white/[0.05]">
        <StatusText status={record.status} />
        <button
          onClick={() => onViewFile(record)}
          className="text-theme-xs text-secondary border-secondary/30 hover:bg-secondary inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors duration-150 hover:text-white"
          title="Open PDF"
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
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          View File
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DivisionIncomingDocumentsTable({
  division,
  records,
  onRecordsChange,
  statusFilter,
  onStatusFilterChange,
}: DivisionIncomingDocumentsTableProps) {
  const [search, setSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Status update modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IncomingDocument | null>(null);

  // Routed divisions modal state
  const [routedModalOpen, setRoutedModalOpen] = useState(false);
  const [routedRecord, setRoutedRecord] = useState<IncomingDocument | null>(null);

  function openUpdateModal(record: IncomingDocument) {
    setSelectedRecord(record);
    setModalOpen(true);
  }

  function handleStatusUpdate(payload: StatusUpdatePayload) {
    if (!selectedRecord) return;
    console.log(
      `[Status Update] Record ${selectedRecord.code}: ${selectedRecord.status} → ${payload.newStatus}`,
      payload.reason ? `Reason: ${payload.reason}` : "",
    );
    onRecordsChange(
      records.map((r) =>
        r.id === selectedRecord.id ? { ...r, status: payload.newStatus } : r,
      ),
    );
  }

  function openRoutedModal(record: IncomingDocument) {
    setRoutedRecord(record);
    setRoutedModalOpen(true);
  }

  function handleRoutingUpdate(divisions: string[]) {
    if (!routedRecord) return;
    console.log(
      `[Routing Update] Record ${routedRecord.code}:`,
      routedRecord.routedDivisions,
      "→",
      divisions,
    );
    onRecordsChange(
      records.map((r) =>
        r.id === routedRecord.id ? { ...r, routedDivisions: divisions } : r,
      ),
    );
  }

  function handleView(record: IncomingDocument) {
    console.log("[View] Record:", record);
  }

  function handleViewFile(record: IncomingDocument) {
    console.log("[View File] Opening PDF for record:", record.code, record.fileUrl);
  }

  // Records here are already scoped to this division by the parent page.
  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q || r.code.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const date = new Date(r.dateReceived);
    const matchesFrom = !filterDateFrom || date >= new Date(filterDateFrom);
    const matchesTo = !filterDateTo || date <= new Date(filterDateTo);
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });

  const hasFilters = search || statusFilter !== "All" || filterDateFrom || filterDateTo;

  return (
    <>
      {selectedRecord && (
        <StatusUpdateModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleStatusUpdate}
          currentStatus={selectedRecord.status}
          documentCode={selectedRecord.code}
          documentSubject={selectedRecord.subject}
        />
      )}

      {routedRecord && (
        <RoutedDivisionsModal
          isOpen={routedModalOpen}
          onClose={() => setRoutedModalOpen(false)}
          documentCode={routedRecord.code}
          documentSubject={routedRecord.subject}
          routedDivisions={routedRecord.routedDivisions}
          onSave={handleRoutingUpdate}
        />
      )}

      <div className="space-y-4">
        {/* ── Filters ── */}
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
              placeholder="Search by code or subject…"
              className="text-theme-sm focus:ring-secondary/40 focus:border-secondary w-full rounded-lg border border-gray-200 bg-white py-2 pr-4 pl-9 text-gray-700 placeholder-gray-400 transition focus:ring-2 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              className="text-theme-sm focus:ring-secondary/40 focus:border-secondary min-w-[130px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 transition focus:ring-2 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200"
            >
              <option value="All">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-1">
              <label className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                From
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="text-theme-sm focus:ring-secondary/40 focus:border-secondary rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 transition focus:ring-2 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                To
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="text-theme-sm focus:ring-secondary/40 focus:border-secondary rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 transition focus:ring-2 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200"
              />
            </div>

            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  onStatusFilterChange("All");
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
              No records match your filters.
            </div>
          ) : (
            filtered.map((record) => (
              <MobileCard
                key={record.id}
                record={record}
                onView={handleView}
                onUpdateStatus={openUpdateModal}
                onViewFile={handleViewFile}
                onViewRouted={openRoutedModal}
              />
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
        <div className="@container hidden rounded-xl border border-gray-200 bg-white md:block dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="w-full overflow-x-auto">
            <div className="min-w-0">
              <Table>
                <TableHeader className="dark:border-white/[0.05]">
                  <TableRow>
                    {[
                      { label: "Code", hide: "" },
                      { label: "Subject", hide: "" },
                      { label: "From", hide: "" },
                      { label: "To", hide: "hidden @4xl:table-cell" },
                      { label: "Routed To", hide: "hidden @4xl:table-cell" },
                      { label: "Date Received", hide: "" },
                      { label: "Status", hide: "" },
                      { label: "File", hide: "" },
                      { label: "Action", hide: "" },
                    ].map((col) => (
                      <TableCell
                        key={col.label}
                        isHeader
                        className={`text-primary text-theme-xs px-3 py-3 text-start font-semibold whitespace-nowrap dark:text-gray-300 ${col.hide}`}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody className="dark:divide-white/[0.05]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
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
                        <TableCell className="px-3 py-3 whitespace-nowrap">
                          <span className="text-theme-xs text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/10 rounded px-2 py-0.5 font-mono font-semibold">
                            {record.code}
                          </span>
                        </TableCell>

                        <TableCell className="text-theme-sm px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                          <span
                            className="block max-w-[160px] truncate"
                            title={record.subject}
                          >
                            {record.subject}
                          </span>
                        </TableCell>

                        <TableCell className="text-theme-sm px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                          <span
                            className="block max-w-[130px] truncate"
                            title={record.from}
                          >
                            {record.from}
                          </span>
                        </TableCell>

                        <TableCell className="text-theme-sm hidden px-3 py-3 text-gray-500 @4xl:table-cell dark:text-gray-400">
                          <span
                            className="block max-w-[130px] truncate"
                            title={record.to}
                          >
                            {record.to}
                          </span>
                        </TableCell>

                        <TableCell className="hidden px-3 py-3 whitespace-nowrap @4xl:table-cell">
                          <RoutedDivisionsButton
                            onClick={() => openRoutedModal(record)}
                          />
                        </TableCell>

                        <TableCell className="text-theme-sm px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {formatDate(record.dateReceived)}
                        </TableCell>

                        <TableCell className="px-3 py-3 whitespace-nowrap">
                          <StatusText status={record.status} />
                        </TableCell>

                        <TableCell className="px-3 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleViewFile(record)}
                            className="text-theme-xs text-secondary border-secondary/30 hover:bg-secondary inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-medium whitespace-nowrap transition-colors duration-150 hover:text-white"
                            title="Open PDF"
                          >
                            <svg
                              className="h-3.5 w-3.5 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                            View File
                          </button>
                        </TableCell>

                        <TableCell className="px-3 py-3">
                          <KebabMenu
                            actions={[
                              { label: "View", icon: <ViewIcon />, handler: () => handleView(record) },
                              { label: "Update Status", icon: <UpdateStatusIcon />, handler: () => openUpdateModal(record) },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
      </div>
    </>
  );
}
