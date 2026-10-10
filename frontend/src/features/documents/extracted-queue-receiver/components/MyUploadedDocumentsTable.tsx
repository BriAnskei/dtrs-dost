import { Eye, FileText, Search, Trash2 } from "lucide-react";
import Input from "../../../../components/form/input/InputField";
import TableShell, {
  type TableShellColumn,
} from "../../../../components/tables/TableShell";
import Badge from "../../../../components/ui/badge/Badge";
import KebabMenu from "../../../../components/ui/kebab-menu/KebabMenu";
import type { TableShellProp } from "../../../../type/table-shell-prop";
import { formatDateTime } from "../../../../utils/dateFormatter";
import type { Decision } from "../../extraction/types/extraction-types";
import { useMyExtractedQueueTable } from "../hooks/use-my-extracted-queue-table";
import {
  canDeleteQueueItem,
  capitalize,
  DECISION_OPTIONS,
  getDecisionBadgeColor,
  getStatusBadgeColor,
  STATUS_OPTIONS,
} from "../my-queue-helpers";
import type {
  ExtractedDocumentQueueSort,
  ExtractedDocumentQueueStatus,
  MyExtractedDocumentQueue,
} from "../types/extracted-queue-receiver-types";
import MyUploadedDocumentViewModal from "./modal/MyUploadedDocumentViewModal";

const SELECT_CLASS =
  "flex-1 min-w-32.5 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-white/3 dark:text-gray-200 transition";

export default function MyUploadedDocumentsTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: TableShellProp = {}) {
  const {
    isLoading,
    isError,
    error,
    items,
    hasFilters,
    clearFilters,
    search,
    setSearch,
    filterDecision,
    setFilterDecision,
    filterStatus,
    setFilterStatus,
    sort,
    toggleSort,
    hasNextPage,
    isFetchingNextPage,
    mobileScrollRef,
    mobileSentinelRef,
    desktopScrollRef,
    desktopSentinelRef,
    viewTarget,
    setViewTarget,
    setDeleteTarget,
  } = useMyExtractedQueueTable();

  const rowActions = (item: MyExtractedDocumentQueue) => [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      handler: () => setViewTarget(item),
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      handler: () => setDeleteTarget(item),
      danger: true,
      disabled: !canDeleteQueueItem(item),
      disabledReason: "Only invalid or invalidated documents can be deleted.",
    },
  ];

  const renderActions = (item: MyExtractedDocumentQueue) => (
    <KebabMenu actions={rowActions(item)} />
  );

  const columns: TableShellColumn<MyExtractedDocumentQueue>[] = [
    {
      label: "File Name",
      width: "w-48",
      render: (item) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-gray-400" />
          <span
            className="block truncate max-w-[280px] font-medium text-gray-800 text-theme-sm dark:text-white/90"
            title={item.file_name}
          >
            {item.file_name}
          </span>
        </div>
      ),
    },
    {
      label: "Decision",
      width: "w-24",
      pill: true,
      render: (item) => (
        <Badge size="sm" color={getDecisionBadgeColor(item.decision)}>
          {capitalize(String(item.decision))}
        </Badge>
      ),
    },
    {
      label: "Status",
      width: "w-24",
      pill: true,
      render: (item) => (
        <Badge size="sm" color={getStatusBadgeColor(item.status)}>
          {capitalize(item.status)}
        </Badge>
      ),
    },
    {
      label: "Uploaded At",
      width: "w-32",
      render: (item) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
          {formatDateTime(item.created_at)}
        </span>
      ),
    },
    {
      label: "Action",
      width: "w-6",
      render: (item) => renderActions(item),
    },
  ];

  return (
    <>
      <TableShell<MyExtractedDocumentQueue>
        columns={columns}
        data={items}
        isLoading={isLoading}
        isError={isError}
        error={error}
        entityName="documents"
        emptyMessage="No uploaded documents match your filters."
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        mobileScrollRef={mobileScrollRef}
        mobileSentinelRef={mobileSentinelRef}
        desktopScrollRef={desktopScrollRef}
        desktopSentinelRef={desktopSentinelRef}
        maxTableHeight={maxTableHeight}
        maxMobileHeight={maxMobileHeight}
        getRowKey={(item) => item.id}
        renderToolbar={() => (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="relative w-full sm:flex-1 sm:min-w-50 sm:max-w-md">
              <Input
                type="text"
                size="sm"
                leadingIcon={<Search className="w-4 h-4" />}
                value={search}
                name="queue-search-no-autofill"
                data-form-type="other"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file name..."
                autoComplete="new-password"
              />
            </div>

            <div className="flex gap-3 flex-wrap items-center">
              <select
                value={filterDecision as string}
                onChange={(e) => setFilterDecision(e.target.value as Decision | "All")}
                className={SELECT_CLASS}
              >
                <option value="All">All Decisions</option>
                {DECISION_OPTIONS.map((d) => (
                  <option key={String(d)} value={String(d)}>
                    {capitalize(String(d))}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as ExtractedDocumentQueueStatus | "All")
                }
                className={SELECT_CLASS}
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {capitalize(s)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={toggleSort}
                title={
                  (sort satisfies ExtractedDocumentQueueSort) === "newest"
                    ? "Newest first"
                    : "Oldest first"
                }
                className="flex items-center gap-1.5 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 dark:border-white/8 dark:bg-white/3 dark:text-gray-200 transition whitespace-nowrap"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${
                    sort === "oldest" ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h13M3 8h9M3 12h5m4 8V4m0 16l-4-4m4 4l4-4"
                  />
                </svg>
                {sort === "newest" ? "Newest" : "Oldest"}
              </button>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/8 dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
        renderMobileCard={(item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-snug truncate">
                  {item.file_name}
                </p>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
              {renderActions(item)}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                  Decision
                </p>
                <div className="mt-1">
                  <Badge size="sm" color={getDecisionBadgeColor(item.decision)}>
                    {capitalize(String(item.decision))}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                  Status
                </p>
                <div className="mt-1">
                  <Badge size="sm" color={getStatusBadgeColor(item.status)}>
                    {capitalize(item.status)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      />

      {viewTarget && (
        <MyUploadedDocumentViewModal
          item={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </>
  );
}
