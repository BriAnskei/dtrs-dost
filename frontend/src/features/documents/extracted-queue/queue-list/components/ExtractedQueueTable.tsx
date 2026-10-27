import { Eye, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router";
import Input from "../../../../../components/form/input/InputField";
import TableShell, {
  type TableShellColumn,
} from "../../../../../components/tables/TableShell";
import KebabMenu from "../../../../../components/ui/kebab-menu/KebabMenu";
import type { TableShellProp } from "../../../../../type/table-shell-prop";
import { formatDateTime } from "../../../../../utils/dateFormatter";
import type {
  ExtractedDocumentQueue,
  ExtractedDocumentQueueSort,
} from "../../types/extracted-document-queue.types";
import { useExtractedQueueTable } from "../hooks/use-extracted-queue-table";
import ActiveFilterChips from "./ActiveFilterChips";
import DecisionBadge from "./DicisionBadge";
import FilterPopover from "./FilterPopover";

function UploaderName({ name }: { name: string | null }) {
  return name ? (
    <span className="text-gray-700 text-theme-sm dark:text-gray-300">{name}</span>
  ) : (
    <span className="italic text-gray-400 text-theme-sm dark:text-gray-500">
      Unknown uploader
    </span>
  );
}

function QueueRowActions({
  queue,
  onView,
}: {
  queue: ExtractedDocumentQueue;
  onView: (queue: ExtractedDocumentQueue) => void;
}) {
  return (
    <KebabMenu
      title="Queue actions"
      actions={[
        {
          label: "View file",
          icon: <Eye className="h-4 w-4" />,
          handler: () => onView(queue),
        },
      ]}
    />
  );
}

export default function ExtractedQueueTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: TableShellProp = {}) {
  const {
    isLoading,
    isError,
    error,
    queues,
    hasNextPage,
    isFetchingNextPage,
    mobileScrollRef,
    mobileSentinelRef,
    desktopScrollRef,
    desktopSentinelRef,
    search,
    setSearch,
    decision,
    setDecision,
    unknownUploader,
    setUnknownUploader,
    sort,
    setSort,
    isFiltered,
    activeFilterCount,
    clearFacetFilters,
  } = useExtractedQueueTable();

  const navigate = useNavigate();
  const viewQueue = (q: ExtractedDocumentQueue) => navigate(`/extracted-queues/${q.id}`);

  const columns: TableShellColumn<ExtractedDocumentQueue>[] = [
    {
      label: "File Name",
      width: "w-64",
      render: (q) => (
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-4 shrink-0 text-gray-400" />
          <span
            className="block truncate max-w-56 font-medium text-gray-800 text-theme-sm dark:text-white/90"
            title={q.file_name}
          >
            {q.file_name}
          </span>
        </div>
      ),
    },
    {
      label: "Uploaded by",
      width: "w-36",
      render: (q) => <UploaderName name={q.uploader_name} />,
    },
    {
      label: "Decision",
      width: "w-20",
      pill: true,
      render: (q) => <DecisionBadge decision={q.decision} />,
    },
    {
      label: "Uploaded",
      width: "w-32",
      render: (q) => (
        <span className="whitespace-nowrap text-gray-500 text-theme-sm dark:text-gray-400">
          {formatDateTime(q.created_at)}
        </span>
      ),
    },
    {
      label: "Action",
      width: "w-6",
      render: (q) => <QueueRowActions queue={q} onView={viewQueue} />,
    },
  ];

  return (
    <TableShell<ExtractedDocumentQueue>
      columns={columns}
      data={queues}
      isLoading={isLoading}
      isError={isError}
      error={error}
      entityName="documents"
      emptyMessage={
        isFiltered ? "No documents match your filters." : "No extracted documents yet."
      }
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      mobileScrollRef={mobileScrollRef}
      mobileSentinelRef={mobileSentinelRef}
      desktopScrollRef={desktopScrollRef}
      desktopSentinelRef={desktopSentinelRef}
      maxTableHeight={maxTableHeight}
      maxMobileHeight={maxMobileHeight}
      showMobileCount={false}
      getRowKey={(q) => q.id}
      renderToolbar={() => (
        <div className="space-y-3">
          {/* One row: search on the left, filter / sort on the right */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:min-w-50 sm:max-w-md sm:flex-1">
              <Input
                type="text"
                size="sm"
                leadingIcon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by uploader name…"
                disabled={unknownUploader}
              />
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <FilterPopover
                decision={decision}
                onDecisionChange={setDecision}
                unknownUploader={unknownUploader}
                onUnknownUploaderChange={setUnknownUploader}
                activeCount={activeFilterCount}
                onReset={clearFacetFilters}
              />

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as ExtractedDocumentQueueSort)}
                aria-label="Sort"
                className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-white/3 dark:text-gray-200 transition"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          <ActiveFilterChips
            decision={decision}
            unknownUploader={unknownUploader}
            onClearDecision={() => setDecision(undefined)}
            onClearUnknownUploader={() => setUnknownUploader(false)}
            onClearAll={clearFacetFilters}
          />
        </div>
      )}
      renderMobileCard={(q) => (
        <div
          key={q.id}
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 dark:border-white/8 dark:bg-white/3"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => viewQueue(q)}
                className="block w-full truncate text-start font-medium text-gray-800 text-theme-sm dark:text-white/90"
              >
                {q.file_name}
              </button>
              <div className="mt-0.5">
                <UploaderName name={q.uploader_name} />
              </div>
            </div>

            <QueueRowActions queue={q} onView={viewQueue} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <DecisionBadge decision={q.decision} />
            <span className="text-theme-xs text-gray-400 dark:text-gray-500">
              {formatDateTime(q.created_at)}
            </span>
          </div>
        </div>
      )}
    />
  );
}
