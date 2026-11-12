import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useDebounce } from "use-debounce";
import {
  type DateRange,
  EMPTY_RANGE,
  hasRange,
} from "../../../../../components/ui/date/date-constants";
import { useInfiniteScrollSentinel } from "../../../../../hooks/user-infinite-scroll-sentinel";
import { DEFAULT_STATUS, type StatusFilter } from "../../constants";
import { DEFAULT_DIVISION_SORT } from "../contants";
import type {
  DivisionIncomingDocument,
  DivisionIncomingDocumentSortOrder,
} from "../types/division-incoming-document.type";
import { useDivisionIncomingDocuments } from "./api/use-division-incoming-documents";

export function useDivisionIncomingDocumentsTable() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  // DateRangeFilter only emits a complete range or an empty one.
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_RANGE);
  const [sort, setSort] =
    useState<DivisionIncomingDocumentSortOrder>(DEFAULT_DIVISION_SORT);

  const [debouncedSearch] = useDebounce(search.trim(), 400);
  const hasDateFilter = hasRange(dateRange);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status || undefined,
      sort,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    }),
    [debouncedSearch, status, sort, dateRange],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDivisionIncomingDocuments(filters);

  const documents = useMemo<DivisionIncomingDocument[]>(
    () => (data ? data.pages.flatMap((page) => page.data) : []),
    [data],
  );

  const hasFilters =
    !!search ||
    status !== DEFAULT_STATUS ||
    hasDateFilter ||
    sort !== DEFAULT_DIVISION_SORT;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const openDetails = useCallback(
    (doc: DivisionIncomingDocument) => navigate(`/incoming-route/${doc.id}`),
    [navigate],
  );

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
    setDateRange(EMPTY_RANGE);
    setSort(DEFAULT_DIVISION_SORT);
  }, []);

  return {
    openDetails,
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
    mobileScrollRef: mobileScroll.rootRef,
    mobileSentinelRef: mobileScroll.sentinelRef,
    desktopScrollRef: desktopScroll.rootRef,
    desktopSentinelRef: desktopScroll.sentinelRef,
  };
}
