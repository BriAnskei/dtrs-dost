import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../../hooks/user-infinite-scroll-sentinel";
import { type DateRange, EMPTY_RANGE, hasRange } from "../../../../components/ui/date/date-constants";
import {
  DEFAULT_DATE_FIELD,
  DEFAULT_SORT,
  DEFAULT_STATUS,
  type StatusFilter,
} from "../constants";
import type {
  IncomingDocumentDateField,
  IncomingDocumentSortOrder,
} from "../types/incoming-document.type";
import type { IncomingDocumentRow } from "../types/incoming-document-row.type";
import { mapIncomingDocumentsResponse } from "../utils/MapIncomingDocuments";
import { useIncomingDocuments } from "./api/use-incoming-documents";

export function useIncomingDocumentsTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [dateField, setDateField] =
    useState<IncomingDocumentDateField>(DEFAULT_DATE_FIELD);
  // DateRangeFilter only ever emits a complete range or an empty one, so
  // startDate <= endDate always holds (the backend 400s otherwise).
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_RANGE);
  const [sort, setSort] = useState<IncomingDocumentSortOrder>(DEFAULT_SORT);

  const [debouncedSearch] = useDebounce(search.trim(), 400);

  const hasDateFilter = hasRange(dateRange);

  // dateField only matters while a range is set, so it is left out of the
  // request (and the query key) otherwise — changing it alone refetches nothing.
  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status || undefined,
      sort,
      dateField: hasDateFilter ? dateField : undefined,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    }),
    [debouncedSearch, status, sort, hasDateFilter, dateField, dateRange],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useIncomingDocuments(filters);

  const documents = useMemo<IncomingDocumentRow[]>(
    () =>
      data ? data.pages.flatMap((page) => mapIncomingDocumentsResponse(page.data)) : [],
    [data],
  );

  const hasFilters =
    !!search ||
    status !== DEFAULT_STATUS ||
    hasDateFilter ||
    dateField !== DEFAULT_DATE_FIELD ||
    sort !== DEFAULT_SORT;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Mobile cards and the desktop table are two distinct scroll containers,
  // each needs its own IntersectionObserver + root.
  const mobileScroll = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });
  const desktopScroll = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus(DEFAULT_STATUS);
    setDateField(DEFAULT_DATE_FIELD);
    setDateRange(EMPTY_RANGE);
    setSort(DEFAULT_SORT);
  }, []);

  // Row selected for the detail view.
  // TODO: Master-Detail slide-over — render it from `detailTarget` in the table.
  const [detailTarget, setDetailTarget] = useState<IncomingDocumentRow | null>(null);

  return {
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
    mobileScrollRef: mobileScroll.rootRef,
    mobileSentinelRef: mobileScroll.sentinelRef,
    desktopScrollRef: desktopScroll.rootRef,
    desktopSentinelRef: desktopScroll.sentinelRef,
    detailTarget,
    setDetailTarget,
  };
}
