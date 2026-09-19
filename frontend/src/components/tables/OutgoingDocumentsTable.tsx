import { useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import KebabMenu, {
  ArchiveIcon,
  HistoryIcon,
  ViewIcon,
} from "../ui/kebab-menu/KebabMenu";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutgoingDocument {
  id: number;
  code: string;
  subject: string;
  to: string;
  receivedBy: string;
  fileUrl: string;
  dateReleased: string;
  dateReceived: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockData: OutgoingDocument[] = [
  {
    id: 1,
    code: "2024-08-001",
    subject: "Budget Proposal FY2024",
    to: "Finance Department",
    receivedBy: "John Doe",
    fileUrl: "/files/budget-proposal-2024.pdf",
    dateReleased: "2024-01-08",
    dateReceived: "2024-01-10",
  },
  {
    id: 2,
    code: "2024-12-002",
    subject: "Infrastructure Maintenance Request",
    to: "Facilities Management",
    receivedBy: "Pedro Reyes",
    fileUrl: "/files/maintenance-request.pdf",
    dateReleased: "2024-01-12",
    dateReceived: "2024-01-14",
  },
  {
    id: 3,
    code: "2024-16-003",
    subject: "Staff Regularization Endorsement",
    to: "HR Department",
    receivedBy: "Ana Cruz",
    fileUrl: "/files/regularization-endorsement.pdf",
    dateReleased: "2024-01-16",
    dateReceived: "2024-01-18",
  },
  {
    id: 4,
    code: "2024-20-004",
    subject: "Procurement of Office Supplies",
    to: "Administrative Office",
    receivedBy: "Carlos Mendoza",
    fileUrl: "/files/procurement-supplies.pdf",
    dateReleased: "2024-01-20",
    dateReceived: "2024-01-22",
  },
  {
    id: 5,
    code: "2024-23-005",
    subject: "Annual Performance Review Results",
    to: "HR Department",
    receivedBy: "Maria Santos",
    fileUrl: "/files/performance-review.pdf",
    dateReleased: "2024-01-23",
    dateReceived: "2024-01-25",
  },
  {
    id: 6,
    code: "2024-30-006",
    subject: "Legal Compliance Audit Report",
    to: "Legal Affairs",
    receivedBy: "Ramon Garcia",
    fileUrl: "/files/audit-report.pdf",
    dateReleased: "2024-01-30",
    dateReceived: "2024-02-01",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Mobile Card ─�─────────────────────────────────────────────────────────────

function MobileCard({
  record,
  onViewFile,
}: {
  record: OutgoingDocument;
  onViewFile: (r: OutgoingDocument) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3">
      {/* Top row: code + kebab */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-theme-xs font-semibold text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/10 px-2 py-0.5 rounded">
          {record.code}
        </span>
        <KebabMenu
          actions={[
            { label: "View", icon: <ViewIcon />, handler: () => console.log("[View] Record:", record) },
            { label: "History", icon: <HistoryIcon />, handler: () => console.log("[History] Audit log for record:", record) },
            { label: "Archive", icon: <ArchiveIcon />, handler: () => console.log("[Archive] Record:", record) },
          ]}
        />
      </div>

      {/* Subject */}
      <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-snug">
        {record.subject}
      </p>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            To
          </p>
          <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
            {record.to}
          </p>
        </div>
        <div>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Date Prepared/Released
          </p>
          <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
            {formatDate(record.dateReleased)}
          </p>
        </div>
        <div>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Date Received
          </p>
          <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
            {formatDate(record.dateReceived)}
          </p>
        </div>
        <div>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Received By
          </p>
          <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
            {record.receivedBy}
          </p>
        </div>
      </div>

      {/* Bottom row: file button */}
      <div className="flex items-center justify-end pt-1 border-t border-gray-100 dark:border-white/[0.05]">
        <button
          onClick={() => onViewFile(record)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-theme-xs font-medium text-secondary border border-secondary/30 hover:bg-secondary hover:text-white transition-colors duration-150"
          title="Open PDF"
        >
          <svg
            className="w-3.5 h-3.5"
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

export default function OutgoingDocumentsTable() {
  const [records, setRecords] = useState<OutgoingDocument[]>(mockData);
  const [search, setSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  function handleViewFile(record: OutgoingDocument) {
    console.log("[View File] Opening PDF for record:", record.code, record.fileUrl);
  }

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q || r.code.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q);
    const date = new Date(r.dateReceived);
    const matchesFrom = !filterDateFrom || date >= new Date(filterDateFrom);
    const matchesTo = !filterDateTo || date <= new Date(filterDateTo);
    return matchesSearch && matchesFrom && matchesTo;
  });

  const hasFilters = search || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* Search */}
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
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
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or subject…"
            className="w-full pl-9 pr-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500 transition"
          />
        </div>

        <div className="flex gap-3 flex-wrap items-end">
          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-theme-xs text-gray-500 dark:text-gray-400 font-medium">
              From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-theme-xs text-gray-500 dark:text-gray-400 font-medium">
              To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
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
              className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Cards (< md) ── */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
            No records match your filters.
          </div>
        ) : (
          filtered.map((record) => (
            <MobileCard key={record.id} record={record} onViewFile={handleViewFile} />
          ))
        )}
        {filtered.length > 0 && (
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 text-right px-1">
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
      <div className="hidden md:block rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] @container">
        <div className="w-full overflow-x-auto">
          <div className="min-w-0">
            <Table>
              <TableHeader className="dark:border-white/[0.05]">
                <TableRow>
                  {[
                    { label: "ID Code", hide: "" },
                    { label: "To", hide: "" },
                    {
                      label: "Date Prepared/Released",
                      hide: "hidden @4xl:table-cell",
                    },
                    { label: "Subject", hide: "" },
                    { label: "Date Received", hide: "hidden @4xl:table-cell" },
                    { label: "Received By", hide: "hidden @4xl:table-cell" },
                    { label: "Link (PDF/Softcopy)", hide: "" },
                    { label: "Action", hide: "" },
                  ].map((col) => (
                    <TableCell
                      key={col.label}
                      isHeader
                      className={`px-3 py-3 font-semibold text-primary text-start text-theme-xs dark:text-gray-300 whitespace-nowrap ${col.hide}`}
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
                      colSpan={8}
                      className="px-5 py-10 text-center text-gray-400 text-theme-sm"
                    >
                      No records match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((record) => (
                    <TableRow
                      key={record.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Code */}
                      <TableCell className="px-3 py-3 whitespace-nowrap">
                        <span className="font-mono text-theme-xs font-semibold text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/10 px-2 py-0.5 rounded">
                          {record.code}
                        </span>
                      </TableCell>

                      {/* To */}
                      <TableCell className="px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <span className="block truncate max-w-[150px]" title={record.to}>
                          {record.to}
                        </span>
                      </TableCell>

                      {/* Date Prepared/Released */}
                      <TableCell className="hidden @4xl:table-cell px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                        {formatDate(record.dateReleased)}
                      </TableCell>

                      {/* Subject */}
                      <TableCell className="px-3 py-3 text-gray-800 dark:text-white/90 text-theme-sm font-medium">
                        <span
                          className="block truncate max-w-[200px]"
                          title={record.subject}
                        >
                          {record.subject}
                        </span>
                      </TableCell>

                      {/* Date Received */}
                      <TableCell className="hidden @4xl:table-cell px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                        {formatDate(record.dateReceived)}
                      </TableCell>

                      {/* Received By */}
                      <TableCell className="hidden @4xl:table-cell px-3 py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                        {record.receivedBy}
                      </TableCell>

                      {/* Link (PDF/Softcopy) */}
                      <TableCell className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleViewFile(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-theme-xs font-medium text-secondary border border-secondary/30 hover:bg-secondary hover:text-white transition-colors duration-150 whitespace-nowrap"
                          title="Open PDF"
                        >
                          <svg
                            className="w-3.5 h-3.5 flex-shrink-0"
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

                      {/* Action */}
                      <TableCell className="px-3 py-3">
                        <KebabMenu
                          actions={[
                            { label: "View", icon: <ViewIcon />, handler: () => console.log("[View] Record:", record) },
                            { label: "History", icon: <HistoryIcon />, handler: () => console.log("[History] Audit log for record:", record) },
                            { label: "Archive", icon: <ArchiveIcon />, handler: () => console.log("[Archive] Record:", record) },
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

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
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
  );
}
