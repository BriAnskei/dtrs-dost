// components/receiver/RecentUploads.tsx
import { useState } from "react";
import Pagination from "../common/Pagination";
import Badge from "../ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";

type DocStatus = "On-Queue" | "Received" | "Rejected";

interface UploadedDocument {
  id: number;
  code: string;
  subject: string;
  status: DocStatus;
  dateUploaded: string;
}

const recentUploads: UploadedDocument[] = [
  {
    id: 1,
    code: "UP-2024-020",
    subject: "Road Request Letter",
    status: "On-Queue",
    dateUploaded: "2024-06-20",
  },
  {
    id: 2,
    code: "UP-2024-019",
    subject: "Project Endorsement Letter",
    status: "Received",
    dateUploaded: "2024-06-18",
  },
  {
    id: 3,
    code: "UP-2024-018",
    subject: "Budget Allocation Request",
    status: "Received",
    dateUploaded: "2024-06-17",
  },
  {
    id: 4,
    code: "UP-2024-017",
    subject: "Staff Deployment Memo",
    status: "Received",
    dateUploaded: "2024-06-15",
  },
  {
    id: 5,
    code: "UP-2024-016",
    subject: "Infrastructure Audit Report",
    status: "On-Queue",
    dateUploaded: "2024-06-14",
  },
  {
    id: 6,
    code: "UP-2024-015",
    subject: "Procurement Request Form",
    status: "Received",
    dateUploaded: "2024-06-12",
  },
  {
    id: 7,
    code: "UP-2024-014",
    subject: "Health Permit Application",
    status: "Rejected",
    dateUploaded: "2024-06-10",
  },
  {
    id: 8,
    code: "UP-2024-013",
    subject: "Zoning Compliance Report",
    status: "Rejected",
    dateUploaded: "2024-06-08",
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadgeColor(status: DocStatus): "success" | "warning" | "danger" {
  if (status === "Received") return "success";
  if (status === "Rejected") return "danger";
  return "warning";
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

const UPLOADS_PER_PAGE = 5;

export default function RecentUploads() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(recentUploads.length / UPLOADS_PER_PAGE));
  const pageStart = (currentPage - 1) * UPLOADS_PER_PAGE;
  const pagedUploads = recentUploads.slice(pageStart, pageStart + UPLOADS_PER_PAGE);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Uploads
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Your latest submitted documents
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-theme-sm font-medium text-[#475569] shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 self-start sm:self-auto">
          See all
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <Table>
          <TableHeader className="border-y border-[#f1f5f9] dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Document
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Code
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Date Uploaded
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="dark:divide-gray-800">
            {pagedUploads.map((doc) => (
              <TableRow
                key={doc.id}
                className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
              >
                {/* Document name */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/5 dark:bg-secondary/10 flex-shrink-0">
                      <DocumentIcon className="w-4 h-4 text-primary dark:text-secondary" />
                    </div>
                    <span
                      className="font-medium text-gray-800 text-theme-sm dark:text-white/90 truncate max-w-[180px]"
                      title={doc.subject}
                    >
                      {doc.subject}
                    </span>
                  </div>
                </TableCell>

                {/* Code */}
                <TableCell className="py-3">
                  <span className="font-mono text-theme-xs font-semibold text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/10 px-2 py-0.5 rounded">
                    {doc.code}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="py-3">
                  <Badge size="sm" color={statusBadgeColor(doc.status)}>
                    {doc.status}
                  </Badge>
                </TableCell>

                {/* Date */}
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                  {formatDate(doc.dateUploaded)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
