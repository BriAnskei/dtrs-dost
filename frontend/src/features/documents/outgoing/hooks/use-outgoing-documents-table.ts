import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../../hooks/user-infinite-scroll-sentinel";
import { DEFAULT_DATE_FIELD, DEFAULT_SORT } from "../constants";
import { type DateRange, EMPTY_RANGE, hasRange } from "../date-constants";
import type {
  OutgoingDocumentDateField,
  OutgoingDocumentSort,
} from "../types/outgoing-document.type";
import type { OutgoingDocumentRow } from "../types/outgoing-document-row.type";
import { mapOutgoingDocumentsResponse } from "../utils/mapOutgoingDocuments";
import { useOutgoingDocuments } from "./api/use-outgoing-documents";

export function useOutgoingDocumentsTable() {
  const [search, setSearch] = useState("");
  const [dateField, setDateField] =
    useState<OutgoingDocumentDateField>(DEFAULT_DATE_FIELD);
  // DateRangeFilter only ever emits a complete range or an empty one, so
  // startDate <= endDate always holds (the backend 400s otherwise).
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_RANGE);
  const [sort, setSort] = useState<OutgoingDocumentSort>(DEFAULT_SORT);

  const [debouncedSearch] = useDebounce(search.trim(), 400);

  const hasDateFilter = hasRange(dateRange);

  // dateField only matters while a range is set, so it is left out of the
  // request (and the query key) otherwise — changing it alone refetches nothing.
  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      sort,
      dateField: hasDateFilter ? dateField : undefined,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    }),
    [debouncedSearch, sort, hasDateFilter, dateField, dateRange],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOutgoingDocuments(filters);

  const documents = useMemo<OutgoingDocumentRow[]>(
    () =>
      data ? data.pages.flatMap((page) => mapOutgoingDocumentsResponse(page.data)) : [],
    [data],
  );

  const hasFilters =
    !!search ||
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
    setDateField(DEFAULT_DATE_FIELD);
    setDateRange(EMPTY_RANGE);
    setSort(DEFAULT_SORT);
  }, []);

  // Row selected for the detail view.
  // TODO: Master-Detail slide-over — render it from `detailTarget` in the table.
  const [detailTarget, setDetailTarget] = useState<OutgoingDocumentRow | null>(null);

  return {
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
    mobileScrollRef: mobileScroll.rootRef,
    mobileSentinelRef: mobileScroll.sentinelRef,
    desktopScrollRef: desktopScroll.rootRef,
    desktopSentinelRef: desktopScroll.sentinelRef,
    detailTarget,
    setDetailTarget,
  };
}
