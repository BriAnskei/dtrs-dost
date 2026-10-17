import { ChevronRight } from "lucide-react";
import TableShell, {
  type TableShellColumn,
} from "../../../../components/tables/TableShell";
import type { TableShellProp } from "../../../../type/table-shell-prop";
import { useOutgoingDocumentsTable } from "../hooks/use-outgoing-documents-table";
import type { OutgoingDocumentRow } from "../types/outgoing-document-row.type";
import OutgoingDocumentsFilters from "./OutgoingDocumentFilters";

export default function OutgoingDocumentsTable({
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
  } = useOutgoingDocumentsTable();

  // TODO: Master-Detail slide-over. For now this only records the selected row;
  // once the slide-over exists, render it below from `detailTarget` and close it
  // with `setDetailTarget(null)`.
  const handleViewDetails = (row: OutgoingDocumentRow) => setDetailTarget(row);

  const columns: TableShellColumn<OutgoingDocumentRow>[] = [
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
      label: "Date Prepared",
      width: "w-24",
      render: (row) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
          {row.datePrepared}
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
    <TableShell<OutgoingDocumentRow>
      columns={columns}
      data={documents}
      isLoading={isLoading}
      isError={isError}
      error={error}
      entityName="documents"
      emptyMessage="No outgoing documents match your filters."
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
        <OutgoingDocumentsFilters
          search={search}
          onSearchChange={setSearch}
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
            <ChevronRight
              className="h-4 w-4 shrink-0 mt-1 text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                Date Prepared
              </p>
              <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
                {row.datePrepared}
              </p>
            </div>
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
