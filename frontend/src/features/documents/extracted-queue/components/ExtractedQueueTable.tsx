import { Ban, Check, Eye, Search } from "lucide-react";
import Input from "../../../../components/form/input/InputField";
import TableShell, {
  type TableShellColumn,
} from "../../../../components/tables/TableShell";
import KebabMenu from "../../../../components/ui/kebab-menu/KebabMenu";
import type { TableShellProp } from "../../../../type/table-shell-prop";
import {
  type QueueAction,
  useExtractedQueueTable,
} from "../hooks/use-extracted-queue-table";
import type {
  ExtractedDocumentQueue,
  ExtractedDocumentQueueSort,
} from "../types/extracted-document-queue.types";
import ActiveFilterChips from "./ActiveFilterChips";
import BulkActionBar from "./BulkActionBar";
import DecisionBadge from "./DicisionBadge";
import FilterPopover from "./FilterPopover";
import SelectCheckbox from "./SelectBox";
import SelectionMenu from "./SelectMenu";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

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
  onRequestAction,
}: {
  queue: ExtractedDocumentQueue;
  onView: (queue: ExtractedDocumentQueue) => void;
  onRequestAction: (action: QueueAction, ids: string[]) => void;
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
        {
          label: "Accept",
          icon: <Check className="h-4 w-4" />,
          handler: () => onRequestAction("ACCEPT", [queue.id]),
          disabled: queue.decision === "ACCEPT",
        },
        {
          label: "Invalidate",
          icon: <Ban className="h-4 w-4" />,
          handler: () => onRequestAction("INVALID", [queue.id]),
          danger: true,
          disabled: queue.decision === "INVALID",
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
    selectionMode,
    startSelecting,
    exitSelectionMode,
    isSelected,
    toggleOne,
    toggleAllLoaded,
    selectAllLoaded,
    selectByDecision,
    clearSelection,
    selectedCount,
    allLoadedSelected,
    someSelected,
    loadedCounts,
    acceptableCount,
    invalidatableCount,
    requestAction,
    requestBulkAccept,
    requestBulkInvalidate,
    setViewTarget,
    // TODO (modals, later):
    //   pendingAction / closePendingAction / confirmPendingAction → confirm modal
    //   viewTarget → reviewer component
  } = useExtractedQueueTable();

  /** Select button: show the checkboxes, or hide them (which also clears the selection). */
  function toggleSelectionMode() {
    if (selectionMode) exitSelectionMode();
    else startSelecting();
  }

  /** In selection mode a row's main click picks it; otherwise it opens the file. */
  function handlePrimaryClick(q: ExtractedDocumentQueue) {
    if (selectionMode) toggleOne(q.id);
    else setViewTarget(q);
  }

  const selectColumn: TableShellColumn<ExtractedDocumentQueue> = {
    id: "select",
    label: "",
    width: "w-4",
    renderHeader: () => (
      <SelectCheckbox
        ariaLabel="Select all loaded rows"
        checked={allLoadedSelected}
        indeterminate={someSelected}
        disabled={queues.length === 0}
        onChange={toggleAllLoaded}
      />
    ),
    render: (q) => (
      <SelectCheckbox
        ariaLabel={`Select ${q.file_name}`}
        checked={isSelected(q.id)}
        onChange={() => toggleOne(q.id)}
      />
    ),
  };

  const actionColumn: TableShellColumn<ExtractedDocumentQueue> = {
    label: "Action",
    width: "w-6",
    render: (q) => (
      <QueueRowActions queue={q} onView={setViewTarget} onRequestAction={requestAction} />
    ),
  };

  const dataColumns: TableShellColumn<ExtractedDocumentQueue>[] = [
    {
      label: "File",
      width: "w-56",
      render: (q) => (
        <button
          type="button"
          onClick={() => handlePrimaryClick(q)}
          title={q.file_name}
          className="block max-w-64 truncate text-start font-medium text-gray-800 text-theme-sm hover:text-secondary hover:underline dark:text-white/90"
        >
          {q.file_name}
        </button>
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
          {formatDate(q.created_at)}
        </span>
      ),
    },
  ];

  // Checkboxes exist only in selection mode. The per-row kebab is swapped out
  // for the same reason: the bulk bar owns the actions while selecting.
  const columns: TableShellColumn<ExtractedDocumentQueue>[] = [
    ...(selectionMode ? [selectColumn] : []),
    ...dataColumns,
    ...(selectionMode ? [] : [actionColumn]),
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
      getRowClassName={(q) => (isSelected(q.id) ? "bg-secondary/5" : "")}
      renderToolbar={() => (
        <div className="space-y-3">
          {/* One row: search on the left, filter / sort / select on the right */}
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
                className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>

              <div className="ml-auto sm:ml-0">
                <SelectionMenu
                  active={selectionMode}
                  selectedCount={selectedCount}
                  totalLoaded={queues.length}
                  counts={loadedCounts}
                  hasNextPage={hasNextPage}
                  onToggleSelecting={toggleSelectionMode}
                  onSelectAll={selectAllLoaded}
                  onSelectDecision={selectByDecision}
                />
              </div>
            </div>
          </div>

          <ActiveFilterChips
            decision={decision}
            unknownUploader={unknownUploader}
            onClearDecision={() => setDecision(undefined)}
            onClearUnknownUploader={() => setUnknownUploader(false)}
            onClearAll={clearFacetFilters}
          />

          {selectionMode && (
            <BulkActionBar
              selectedCount={selectedCount}
              acceptableCount={acceptableCount}
              invalidatableCount={invalidatableCount}
              hasUnloadedRows={allLoadedSelected && hasNextPage}
              onAccept={requestBulkAccept}
              onInvalidate={requestBulkInvalidate}
              onClear={clearSelection}
              onDone={exitSelectionMode}
            />
          )}
        </div>
      )}
      renderMobileCard={(q) => (
        <div
          key={q.id}
          onClick={selectionMode ? () => toggleOne(q.id) : undefined}
          className={`rounded-xl border p-4 space-y-3 ${
            selectionMode ? "cursor-pointer" : ""
          } ${
            isSelected(q.id)
              ? "border-secondary/40 bg-secondary/5"
              : "border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]"
          }`}
        >
          <div className="flex items-start gap-3">
            {selectionMode && (
              // Stop the tap reaching the card, otherwise it would toggle twice.
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                <SelectCheckbox
                  ariaLabel={`Select ${q.file_name}`}
                  checked={isSelected(q.id)}
                  onChange={() => toggleOne(q.id)}
                />
              </div>
            )}

            <div className="min-w-0 flex-1">
              {/* In selection mode this has no handler of its own: the tap bubbles to the card. */}
              <button
                type="button"
                onClick={selectionMode ? undefined : () => setViewTarget(q)}
                className="block w-full truncate text-start font-medium text-gray-800 text-theme-sm dark:text-white/90"
              >
                {q.file_name}
              </button>
              <div className="mt-0.5">
                <UploaderName name={q.uploader_name} />
              </div>
            </div>

            {!selectionMode && (
              <QueueRowActions
                queue={q}
                onView={setViewTarget}
                onRequestAction={requestAction}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <DecisionBadge decision={q.decision} />
            <span className="text-theme-xs text-gray-400 dark:text-gray-500">
              {formatDate(q.created_at)}
            </span>
          </div>
        </div>
      )}
    />
  );
}
