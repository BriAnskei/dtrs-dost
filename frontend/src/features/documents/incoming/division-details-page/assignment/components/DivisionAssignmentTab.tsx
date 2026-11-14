import { ArrowDownUp, Search, X } from "lucide-react";
import { type ReactNode, useId } from "react";
import { SkeletonTheme } from "react-loading-skeleton";
import { THIN_SCROLLBAR } from "../../../../../../contant/ThinScrollBar";
import { SKELETON_BASE, SKELETON_HIGHLIGHT } from "../../../detials-page/constant";
import AssignmentRow, {
  AssignmentRowSkeleton,
} from "../../../shared/component/AssignmentRow";
import { secondaryButton } from "../../../shared/detial-panel-form-style-constant";
import {
  canCompleteInDivision,
  canStartInDivision,
  STATUS_FILTERS,
  useDivisionAssignmentsTab,
} from "../hooks/use-division-assignments-tab";
import DivisionCompleteAssignmentPanel from "./DivisionCompleteAssignmentPanel";
import DivisionStartAssignmentModal from "./modal/DivisionStartAssingmentModal";

interface DivisionAssignmentsTabProps {
  incomingDocumentId: string;
  /** Fixed height of the scrollable list, same approach as the admin tab. */
  maxListHeight?: string;
}

const fieldFocus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

/** Mobile: 44px tall, 16px text (no iOS zoom on focus). sm and up: 36px / theme-sm. */
function StatusSelect({
  value,
  onChange,
}: {
  value: (typeof STATUS_FILTERS)[number]["id"];
  onChange: (next: (typeof STATUS_FILTERS)[number]["id"]) => void;
}) {
  const id = useId();
  return (
    <div className="w-full sm:w-auto">
      <label htmlFor={id} className="sr-only">
        Filter by status
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as typeof value)}
        className={`h-11 w-full rounded-lg border bg-transparent px-3 text-base dark:bg-gray-900 sm:h-9 sm:w-auto sm:text-theme-sm ${fieldFocus} ${
          value === STATUS_FILTERS[0].id
            ? "border-gray-200 text-gray-600 dark:border-white/8 dark:text-gray-300"
            : "border-primary/50 text-gray-800 dark:text-white/90"
        }`}
      >
        {STATUS_FILTERS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ListSkeleton({ rows, label }: { rows: number; label: string }) {
  return (
    <SkeletonTheme baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT}>
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="divide-y divide-gray-200 dark:divide-white/8"
      >
        {Array.from({ length: rows }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows, never reordered.
          <AssignmentRowSkeleton key={i} />
        ))}
      </div>
    </SkeletonTheme>
  );
}

function Message({
  title,
  body,
  action,
  role,
}: {
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  role?: "alert";
}) {
  return (
    <div role={role} className="px-4 py-12 text-center">
      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
        {title}
      </p>
      {body && (
        <p className="mx-auto mt-1 max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
          {body}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`mt-3 rounded text-theme-sm font-medium text-primary hover:underline ${fieldFocus}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab                                                                       */
/* -------------------------------------------------------------------------- */

export default function DivisionAssignmentsTab({
  incomingDocumentId,
  maxListHeight = "560px",
}: DivisionAssignmentsTabProps) {
  const {
    query,
    items,
    hasMore,
    isLoadingMore,
    loadMoreFailed,
    loadMore,
    scrollRef,
    sentinelRef,
    status,
    setStatus,
    sort,
    toggleSort,
    hasActiveFilters,
    clearFilters,
    searchInput,
    setSearchInput,
    search,
    isPlaceholderData,
    searchId,
    searchRef,
    clearSearch,
    handleSearchKeyDown,
    start,
    completingId,
    requestComplete,
    closeComplete,
    handleCompleted,
    fullError,
    showToolbar,
    showFooter,
    countLabel,
  } = useDivisionAssignmentsTab(incomingDocumentId);

  let content: ReactNode;
  if (query.isLoading) {
    content = <ListSkeleton rows={3} label="Loading assignments" />;
  } else if (fullError) {
    content = (
      <Message
        role="alert"
        title="Couldn't load the assignments."
        action={{ label: "Retry", onClick: () => void query.refetch() }}
      />
    );
  } else if (items.length === 0) {
    content = hasActiveFilters ? (
      <Message
        title={
          search
            ? `No notices of action match "${search}"`
            : "No assignments match these filters"
        }
        action={{ label: "Clear filters", onClick: clearFilters }}
      />
    ) : (
      <Message
        title="No notices of action yet"
        body="Assignments for your division on this document will appear here."
      />
    );
  } else {
    content = (
      <>
        <ol className="divide-y divide-gray-200 dark:divide-white/8">
          {items.map((a) => (
            <AssignmentRow
              key={a.id}
              a={a}
              incomingDocumentId={incomingDocumentId}
              isCompleting={completingId === a.id}
              // No onDelete: divisions can't delete assignments.
              onStart={start.request}
              onComplete={requestComplete}
              onCancelComplete={closeComplete}
              onCompleted={handleCompleted}
              // Props added to the shared AssignmentRow (see the notes):
              canStartRow={canStartInDivision}
              canCompleteRow={canCompleteInDivision}
              hideOffice
              renderCompletePanel={({ assignment, panelId, onCancel, onCompleted }) => (
                <DivisionCompleteAssignmentPanel
                  incomingDocumentId={incomingDocumentId}
                  assignment={assignment}
                  panelId={panelId}
                  onCancel={onCancel}
                  onCompleted={onCompleted}
                />
              )}
            />
          ))}
        </ol>

        {/* Reaching this element loads the next page. */}
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />

        {isLoadingMore && (
          <div className="border-t border-gray-200 dark:border-white/8">
            <ListSkeleton rows={2} label="Loading more assignments" />
          </div>
        )}

        {loadMoreFailed && (
          <div className="flex flex-col items-center gap-2 border-t border-gray-200 p-4 dark:border-white/8">
            <p role="alert" className="text-theme-xs text-error-600 dark:text-error-400">
              Couldn't load more assignments.
            </p>
            <button type="button" onClick={loadMore} className={secondaryButton}>
              Try again
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="space-y-4" aria-label="Division assignments">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/3">
        {/* Header block: description, then the search/filter row. */}
        <div className="space-y-4 border-b border-gray-200 p-4 dark:border-white/8">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            Every notice of action assigned to your division on this document.
          </p>

          {showToolbar && (
            // biome-ignore lint/a11y/useSemanticElements: `<search>` needs @types/react 19+; swap it in if you're on those types.
            <div
              role="search"
              aria-label="Filter assignments"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="relative w-full sm:w-96">
                <label htmlFor={searchId} className="sr-only">
                  Search by notice of action
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search notice of action…"
                  autoComplete="off"
                  className={`h-11 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-10 text-base text-gray-800 placeholder:text-gray-400 dark:border-white/8 dark:text-white/90 sm:h-9 sm:pr-9 sm:text-theme-sm [&::-webkit-search-cancel-button]:hidden ${fieldFocus}`}
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearSearch}
                    className={`absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 sm:right-2 sm:h-6 sm:w-6 ${fieldFocus}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/*
                Mobile: 2-column grid. Status and Sort side by side; "Clear all"
                (when filters are active) gets its own full-width row.
                sm and up: inline flex row.
              */}
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                <StatusSelect value={status} onChange={setStatus} />
                <button
                  type="button"
                  onClick={toggleSort}
                  className={`${secondaryButton} w-full justify-center !h-11 !px-3 whitespace-nowrap sm:w-auto sm:!h-9`}
                >
                  <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                  {sort === "newest" ? "Newest first" : "Oldest first"}
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`col-span-2 flex h-11 items-center justify-center rounded px-1 text-theme-sm font-medium text-primary hover:underline sm:col-span-1 sm:h-auto ${fieldFocus}`}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/*
          Scroll area: fixed height, thin scrollbar. Focusable so keyboard users
          can scroll it. Previous results stay visible (dimmed) while a new
          search/filter loads. `relative` contains `sr-only` elements inside rows.
        */}
        {/* biome-ignore lint/a11y/useSemanticElements: scroll container is typed as HTMLDivElement by useInfiniteScrollSentinel. */}
        <div
          ref={scrollRef}
          role="region"
          aria-label="Division assignments list"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-focusable (WCAG 2.1.1).
          tabIndex={0}
          aria-busy={isPlaceholderData}
          className={`relative overflow-y-auto transition-opacity ${THIN_SCROLLBAR} ${fieldFocus} ${
            isPlaceholderData ? "opacity-60" : ""
          }`}
          style={{ height: maxListHeight, overflowAnchor: "none" }}
        >
          {content}
        </div>

        {showFooter && (
          <div
            aria-live="polite"
            className="border-t border-gray-200 px-4 py-3 text-theme-xs text-gray-500 dark:border-white/8 dark:text-gray-400"
          >
            {isPlaceholderData ? (
              "Updating…"
            ) : (
              <>
                Showing{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {items.length}
                  {hasMore ? "+" : ""}
                </span>{" "}
                {countLabel}
                {!hasMore && " (all loaded)"}
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirm step for PENDING -> ONGOING. Rendered in a portal by <Modal>. */}
      <DivisionStartAssignmentModal
        assignment={start.target}
        isPending={start.isPending}
        onConfirm={start.confirm}
        onCancel={start.cancel}
        error={start.errorMessage}
      />
    </section>
  );
}
