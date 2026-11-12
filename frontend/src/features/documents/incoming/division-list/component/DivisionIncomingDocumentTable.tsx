import { Eye } from "lucide-react";
import TableShell, {
  type TableShellColumn,
} from "../../../../../components/tables/TableShell";
import StatusBadge, {
  INCOMING_STATUS_BADGE,
} from "../../../../../components/ui/badge/StatusBadge";
import KebabMenu from "../../../../../components/ui/kebab-menu/KebabMenu";
import type { TableShellProp } from "../../../../../type/table-shell-prop";
import { formatDateTime } from "../../../../../utils/dateFormatter";
import { useDivisionIncomingDocumentsTable } from "../hooks/use-division-incoming-documents-table";
import type { DivisionIncomingDocument } from "../types/division-incoming-document.type";
import DivisionIncomingDocumentsFilters from "./DivisionIncomingDocumentFilters";

export default function DivisionIncomingDocumentsTable({
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
    openDetails,
  } = useDivisionIncomingDocumentsTable();

  const documentActions = (doc: DivisionIncomingDocument) => [
    {
      label: "View details",
      icon: <Eye className="h-4 w-4" />,
      handler: () => openDetails(doc),
    },
  ];

  const renderActions = (doc: DivisionIncomingDocument) => (
    <KebabMenu actions={documentActions(doc)} />
  );

  const columns: TableShellColumn<DivisionIncomingDocument>[] = [
    {
      label: "Code",
      width: "w-28",
      render: (doc) => (
        <span className="font-medium text-primary text-theme-sm dark:text-secondary whitespace-nowrap">
          {doc.code ?? "—"}
        </span>
      ),
    },
    {
      label: "Subject",
      width: "w-56",
      render: (doc) => (
        <span
          className="block truncate max-w-[320px] text-gray-800 text-theme-sm dark:text-white/90"
          title={doc.subject}
        >
          {doc.subject}
        </span>
      ),
    },
    {
      label: "Date Routed",
      width: "w-28",
      render: (doc) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
          {formatDateTime(doc.routed_at)}
        </span>
      ),
    },
    {
      label: "Status",
      width: "w-24",
      render: (doc) => <StatusBadge config={INCOMING_STATUS_BADGE[doc.status]} />,
    },
    {
      label: "Action",
      width: "w-6",
      render: (doc) => renderActions(doc),
    },
  ];

  return (
    <TableShell<DivisionIncomingDocument>
      columns={columns}
      data={documents}
      isLoading={isLoading}
      isError={isError}
      error={error}
      entityName="documents"
      emptyMessage="No routed documents match your filters."
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      mobileScrollRef={mobileScrollRef}
      mobileSentinelRef={mobileSentinelRef}
      desktopScrollRef={desktopScrollRef}
      desktopSentinelRef={desktopSentinelRef}
      maxTableHeight={maxTableHeight}
      maxMobileHeight={maxMobileHeight}
      getRowKey={(doc) => doc.id}
      renderToolbar={() => (
        <DivisionIncomingDocumentsFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          sort={sort}
          onSortChange={setSort}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />
      )}
      renderMobileCard={(doc) => (
        <div
          key={doc.id}
          className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-theme-xs font-medium text-primary dark:text-secondary">
                {doc.code ?? "—"}
              </p>
              <p className="mt-0.5 text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-snug wrap-break-word">
                {doc.subject}
              </p>
            </div>
            {renderActions(doc)}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                Status
              </p>
              <div className="mt-1">
                <StatusBadge config={INCOMING_STATUS_BADGE[doc.status]} />
              </div>
            </div>
            <div>
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                Date Routed
              </p>
              <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
                {formatDateTime(doc.routed_at)}
              </p>
            </div>
          </div>
        </div>
      )}
    />
  );
}
