import { ChevronRight } from "lucide-react";
import TableShell, {
  type TableShellColumn,
} from "../../../../components/tables/TableShell";
import type { TableShellProp } from "../../../../type/table-shell-prop";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "../constants";
import { useIncomingDocumentsTable } from "../hooks/use-incoming-document-table";
import type { IncomingDocumentStatus } from "../types/incoming-document.type";
import type { IncomingDocumentRow } from "../types/incoming-document-row.type";
import IncomingDocumentsFilters from "./IncomingDocumentFilters";

function StatusBadge({ status }: { status: IncomingDocumentStatus }) {
  // Drop any bg-* classes (including dark:bg-*) so only the text color remains
  const textOnly = STATUS_BADGE_CLASSES[status]
    .split(" ")
    .filter((cls) => !/(^|:)bg-/.test(cls))
    .join(" ");

  return (
    <span
      className={`inline-flex items-center text-theme-xs font-medium whitespace-nowrap ${textOnly}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function IncomingDocumentsTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: TableShellProp = {}) {
  const {
    isLoading,
    isError,
    error,
    documents,
    hasFilters,
    clearFilters,
    search,
    setSearch,
    status,
    setStatus,
    dateField,
    setDateField,
    dateRange,
    setDateRange,
    sort,
    setSort,
    hasNextPage,
    isFetchingNextPage,
    mobileScrollRef,
    mobileSentinelRef,
    desktopScrollRef,
    desktopSentinelRef,
    setDetailTarget,
  } = useIncomingDocumentsTable();

  // TODO: Master-Detail slide-over. For now this only records the selected row;
  // once the slide-over exists, render it below from `detailTarget` and close it
  // with `setDetailTarget(null)`.
  const handleViewDetails = (row: IncomingDocumentRow) => setDetailTarget(row);

  const columns: TableShellColumn<IncomingDocumentRow>[] = [
    {
      label: "Tracking No.",
      width: "w-28",
      render: (row) => (
        <span className="font-medium text-primary text-theme-sm dark:text-secondary whitespace-nowrap">
          {row.trackingNo}
        </span>
      ),
    },
    {
      label: "Subject",
      width: "w-56",
      render: (row) => (
        <span
          className="block truncate max-w-[320px] text-gray-800 text-theme-sm dark:text-white/90"
          title={row.subject}
        >
          {row.subject}
        </span>
      ),
    },
    {
      label: "Date Received",
      width: "w-24",
      render: (row) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
          {row.dateReceived}
        </span>
      ),
    },
    {
      label: "Date Uploaded",
      width: "w-24",
      render: (row) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
          {row.dateUploaded}
        </span>
      ),
    },
    {
      label: "Status",
      width: "w-24",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      label: "",
      width: "w-6",
      render: () => (
        <ChevronRight
          className="h-4 w-4 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
      ),
    },
  ];

  return (
    <TableShell<IncomingDocumentRow>
      columns={columns}
      data={documents}
      isLoading={isLoading}
      isError={isError}
      error={error}
      entityName="documents"
      emptyMessage="No incoming documents match your filters."
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      mobileScrollRef={mobileScrollRef}
      mobileSentinelRef={mobileSentinelRef}
      desktopScrollRef={desktopScrollRef}
      desktopSentinelRef={desktopSentinelRef}
      maxTableHeight={maxTableHeight}
      maxMobileHeight={maxMobileHeight}
      getRowKey={(row) => row.id}
      // onRowClick={handleViewDetails}
      renderToolbar={() => (
        <IncomingDocumentsFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          dateField={dateField}
          onDateFieldChange={setDateField}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          sort={sort}
          onSortChange={setSort}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />
      )}
      renderMobileCard={(row) => (
        <div
          key={row.id}
          role="button"
          tabIndex={0}
          onClick={() => handleViewDetails(row)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleViewDetails(row);
            }
          }}
          aria-label={`View details for ${row.subject}`}
          className="cursor-pointer rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-theme-xs font-medium text-primary dark:text-secondary">
                {row.trackingNo}
              </p>
              <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-snug mt-0.5 wrap-break-word">
                {row.subject}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 mt-1">
              <StatusBadge status={row.status} />
              <ChevronRight
                className="h-4 w-4 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
            </div>
          </div>

          <p className="text-theme-xs text-gray-700 dark:text-gray-300 wrap-break-word">
            {row.documentFrom}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                Date Received
              </p>
              <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
                {row.dateReceived}
              </p>
            </div>
            <div>
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                Date Uploaded
              </p>
              <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
                {row.dateUploaded}
              </p>
            </div>
          </div>
        </div>
      )}
    />
  );
}
