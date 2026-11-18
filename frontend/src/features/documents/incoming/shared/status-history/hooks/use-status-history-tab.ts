import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type DateRange,
  EMPTY_RANGE,
  hasRange,
  toYmd,
} from "../../../../../../components/ui/date/date-constants";
import { useInfiniteScrollSentinel } from "../../../../../../hooks/user-infinite-scroll-sentinel";
import { formatDayLabel } from "../../../../../../utils/dateFormatter";
import type { IncomingDocumentStatusHistory } from "../../../shared/types/incoming-document-status-history.types";
import { useIncomingDocumentStatusHistories } from "./api/use-incoming-document-status-histories";

export interface StatusHistoryGroup {
  /** Local-calendar "YYYY-MM-DD". */
  key: string;
  /** "Today", "Yesterday", or e.g. "Mon, Nov 17, 2026". */
  label: string;
  entries: IncomingDocumentStatusHistory[];
}

/**
 * Splits newest-first entries into consecutive same-day groups (local time).
 * Grouping runs over every loaded page, so a day that spans two pages still
 * ends up as one group.
 */
export function groupByDay(
  entries: IncomingDocumentStatusHistory[],
): StatusHistoryGroup[] {
  const groups: StatusHistoryGroup[] = [];
  const now = new Date();

  for (const entry of entries) {
    const date = new Date(entry.created_at);
    const key = toYmd(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.entries.push(entry);
    } else {
      groups.push({ key, label: formatDayLabel(date, now), entries: [entry] });
    }
  }
  return groups;
}

/**
 * State for the Status History tab.
 *
 * Same shape as `useIncomingDocumentsTable`: the filter becomes one memoized
 * object (empty values are `undefined`, so they stay out of the request and
 * the query key), the list is a cursor-paginated infinite query, and an
 * infinite-scroll sentinel loads the next page. Only the loaded pages are in
 * memory, and each date range is its own cached query.
 *
 * The date range comes from `DateRangeFilter`, which only ever reports a
 * complete range or an empty one, so there is no half-filled state to manage
 * and the API never receives a start date without an end date.
 */
export function useStatusHistoryTab(incomingDocumentId: string) {
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_RANGE);

  const filters = useMemo(
    () => ({
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    }),
    [dateRange],
  );

  const query = useIncomingDocumentStatusHistories({
    incomingDocumentId,
    ...filters,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const groups = useMemo(() => groupByDay(items), [items]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Paused while previous results are shown during a refetch, and after a
  // failed page load (so a failure can't retry in a loop; the user taps
  // "Try again" instead).
  const { rootRef: scrollRef, sentinelRef } = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled:
      Boolean(hasNextPage) && !query.isPlaceholderData && !query.isFetchNextPageError,
  });

  // A changed date range is a different list: start from the top.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `filters` is the trigger, not a value read inside the effect.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [filters, scrollRef]);

  const clearFilters = useCallback(() => setDateRange(EMPTY_RANGE), []);

  /* ------------------------------ view flags ------------------------------ */

  /** True while a date range is applied to the list. */
  const hasActiveFilters = hasRange(dateRange);

  const fullError = query.isError && items.length === 0;

  // The toolbar stays put while a filter change reloads the list. It's hidden
  // only when the document has no history at all (nothing to filter).
  const showToolbar =
    hasActiveFilters || (!query.isLoading && !fullError && items.length > 0);

  const showFooter = !query.isLoading && !fullError && items.length > 0;

  const countNoun = hasActiveFilters ? "match" : "status change";
  const countLabel =
    items.length === 1 ? countNoun : hasActiveFilters ? "matches" : "status changes";

  return {
    query,
    items,
    /** Entries grouped by day, newest day first. */
    groups,
    /** True while the previous results are shown during a refetch (date range change). */
    isPlaceholderData: query.isPlaceholderData,
    hasMore: Boolean(hasNextPage),
    isLoadingMore: isFetchingNextPage,
    loadMoreFailed: query.isFetchNextPageError,
    loadMore,
    scrollRef,
    sentinelRef,

    /** The applied range. Pass both to `DateRangeFilter`. */
    dateRange,
    setDateRange,
    hasActiveFilters,
    clearFilters,

    fullError,
    showToolbar,
    showFooter,
    /** "status change(s)" or "match(es)", already pluralised for `items.length`. */
    countLabel,
  };
}
