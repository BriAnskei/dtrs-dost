import { ChevronRight } from "lucide-react";
import TableShell, {
  type TableShellColumn,
} from "../../../../../components/tables/TableShell";
import StatusBadge, {
  INCOMING_STATUS_BADGE,
} from "../../../../../components/ui/badge/StatusBadge";
import type { TableShellProp } from "../../../../../type/table-shell-prop";
import IncomingDocumentDetailPanel from "../../detial-panel/components/IncomingDocumentDetailPanel";
import type { IncomingDocumentRow } from "../../types/incoming-document-row.type";
import { useIncomingDocumentsTable } from "../hooks/use-incoming-document-table";
import IncomingDocumentsFilters from "./IncomingDocumentFilters";

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
    detailTarget,
    setDetailTarget,
  } = useIncomingDocumentsTable();

  const handleViewDetails = (row: IncomingDocumentRow) => setDetailTarget(row);
  const handleCloseDetails = () => setDetailTarget(null);

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
      render: (row) => <StatusBadge config={INCOMING_STATUS_BADGE[row.status]} />,
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
    <>
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
        onRowClick={handleViewDetails}
        getRowClassName={(row) =>
          row.id === detailTarget?.id ? "bg-gray-100/70 dark:bg-white/[0.06]" : ""
        }
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
          <button
            key={row.id}
            type="button"
            onClick={() => handleViewDetails(row)}
            aria-label={`View details for ${row.subject}`}
            className={`block w-full cursor-pointer rounded-xl border bg-white dark:bg-white/[0.03] p-4 text-left space-y-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
              row.id === detailTarget?.id
                ? "border-secondary/50 dark:border-secondary/50"
                : "border-gray-200 dark:border-white/[0.08]"
            }`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="block min-w-0">
                <span className="block text-theme-xs font-medium text-primary dark:text-secondary">
                  {row.trackingNo}
                </span>
                <span className="mt-0.5 block text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-snug wrap-break-word">
                  {row.subject}
                </span>
              </span>
              <span className="mt-1 flex shrink-0 items-center gap-2">
                <StatusBadge config={INCOMING_STATUS_BADGE[row.status]} />
                <ChevronRight
                  className="h-4 w-4 text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                />
              </span>
            </span>

            <span className="block text-theme-xs text-gray-700 dark:text-gray-300 wrap-break-word">
              {row.documentFrom}
            </span>

            <span className="grid grid-cols-2 gap-x-4 gap-y-2">
              <span className="block">
                <span className="block text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                  Date Received
                </span>
                <span className="mt-0.5 block text-theme-xs text-gray-700 dark:text-gray-300">
                  {row.dateReceived}
                </span>
              </span>
              <span className="block">
                <span className="block text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                  Date Uploaded
                </span>
                <span className="mt-0.5 block text-theme-xs text-gray-700 dark:text-gray-300">
                  {row.dateUploaded}
                </span>
              </span>
            </span>
          </button>
        )}
      />

      <IncomingDocumentDetailPanel row={detailTarget} onClose={handleCloseDetails} />
    </>
  );
}
