import type { ReactNode } from "react";
import { SkeletonTheme } from "react-loading-skeleton";
import DateRangeFilter from "../../../../../../components/ui/date/DateRangeFilter";
import { toYmd } from "../../../../../../components/ui/date/date-constants";
import { THIN_SCROLLBAR } from "../../../../../../contant/ThinScrollBar";
import { SKELETON_BASE, SKELETON_HIGHLIGHT } from "../../../detials-page/constant";
import { secondaryButton } from "../../detial-panel-form-style-constant";
import { useStatusHistoryTab } from "../hooks/use-status-history-tab";
import StatusHistoryEntry, { StatusHistoryEntrySkeleton } from "./StatusHistoryEntry";

interface StatusHistoryTabProps {
  incomingDocumentId: string;
  /**
   * Height of the scrollable list. Applied as a fixed height (not a max-height),
   * the same as the Action Assignments tab and the Routed Divisions table, so all
   * tabs keep the same size regardless of how many rows are loaded.
   */
  maxListHeight?: string;
}

const fieldFocus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

function ListSkeleton({ rows, label }: { rows: number; label: string }) {
  return (
    <SkeletonTheme baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT}>
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="my-4 ml-4 border-l border-gray-200 pr-4 dark:border-white/10 sm:ml-6 sm:pr-6"
      >
        {Array.from({ length: rows }, (_, i) => (
          <StatusHistoryEntrySkeleton key={i} />
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

export default function StatusHistoryTab({
  incomingDocumentId,
  maxListHeight = "560px",
}: StatusHistoryTabProps) {
  const {
    query,
    items,
    groups,
    isPlaceholderData,
    hasMore,
    isLoadingMore,
    loadMoreFailed,
    loadMore,
    scrollRef,
    sentinelRef,
    dateRange,
    setDateRange,
    hasActiveFilters,
    clearFilters,
    fullError,
    showToolbar,
    showFooter,
    countLabel,
  } = useStatusHistoryTab(incomingDocumentId);

  let content: ReactNode;
  if (query.isLoading) {
    content = <ListSkeleton rows={3} label="Loading status history" />;
  } else if (fullError) {
    content = (
      <Message
        role="alert"
        title="Couldn't load the status history."
        action={{ label: "Retry", onClick: () => void query.refetch() }}
      />
    );
  } else if (items.length === 0) {
    content = hasActiveFilters ? (
      <Message
        title="No status changes in this date range"
        action={{ label: "Clear dates", onClick: clearFilters }}
      />
    ) : (
      <Message
        title="No status changes yet"
        body="Changes to this document's status will be recorded here."
      />
    );
  } else {
    content = (
      <>
        {/* One group per day. The sticky day header keeps the date in view while
            the entries under it scroll; each entry only shows its time. */}
        <ol>
          {groups.map((group) => (
            <li key={group.key}>
              <h3 className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 px-4 py-2 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/5 dark:bg-gray-900 dark:text-gray-400 sm:px-6">
                {group.label}
              </h3>
              <ol className="my-4 ml-4 border-l border-gray-200 pr-4 dark:border-white/10 sm:ml-6 sm:pr-6">
                {group.entries.map((entry) => (
                  <StatusHistoryEntry
                    key={entry.id}
                    entry={entry}
                    isLatest={!hasActiveFilters && entry.id === items[0]?.id}
                  />
                ))}
              </ol>
            </li>
          ))}
        </ol>

        {/* End of history: tells the reader they've reached the first change. */}
        {!hasMore && !isLoadingMore && (
          <p className="px-4 py-4 text-center text-theme-xs text-gray-400 dark:text-gray-500 sm:px-6">
            {hasActiveFilters ? "No more changes in this date range" : "Start of history"}
          </p>
        )}

        {/* Reaching this element loads the next page. */}
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />

        {isLoadingMore && (
          <div className="border-t border-gray-200 dark:border-white/8">
            <ListSkeleton rows={2} label="Loading more status history" />
          </div>
        )}

        {loadMoreFailed && (
          <div className="flex flex-col items-center gap-2 border-t border-gray-200 p-4 dark:border-white/8">
            <p role="alert" className="text-theme-xs text-error-600 dark:text-error-400">
              Couldn't load more status history.
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
    <section className="space-y-4" aria-label="Status history">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/3">
        {/* Header: description on the left, date filter on the right. The filter
            is just a calendar icon until a range is applied. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-white/8">
          <p className="min-w-0 flex-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Who changed this document's status, and when. Newest first, grouped by day.
          </p>

          {showToolbar && (
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              maxDate={toYmd(new Date())}
              placeholder="Filter by date"
            />
          )}
        </div>

        {/*
          Scroll area: fixed height (same as the other tabs), thin scrollbar.
          Focusable so keyboard users can scroll it. Previous results stay
          visible (dimmed) while a new date range loads.

          `relative` makes this the containing block for any `sr-only`
          (position: absolute) element inside a row, so it is clipped by this
          scroll area instead of stretching the page's scroll height.
        */}
        {/* biome-ignore lint/a11y/useSemanticElements: scroll container is typed as HTMLDivElement by useInfiniteScrollSentinel. */}
        <div
          ref={scrollRef}
          role="region"
          aria-label="Status history list"
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
    </section>
  );
}
