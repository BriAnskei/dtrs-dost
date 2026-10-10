import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../../hooks/user-infinite-scroll-sentinel";
import type { Decision } from "../../extraction/types/extraction-types";
import type {
  ExtractedDocumentQueueSort,
  ExtractedDocumentQueueStatus,
  MyExtractedDocumentQueue,
} from "../types/extracted-queue-receiver-types";
import { useMyExtractedDocumentQueues } from "./api/use-my-extracted-document-queues";

export function useMyExtractedQueueTable() {
  const [search, setSearch] = useState("");
  const [filterDecision, setFilterDecision] = useState<Decision | "All">("All");
  const [filterStatus, setFilterStatus] = useState<ExtractedDocumentQueueStatus | "All">(
    "All",
  );
  const [sort, setSort] = useState<ExtractedDocumentQueueSort>("newest");

  const [debouncedSearch] = useDebounce(search, 400);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyExtractedDocumentQueues({
    file_name: debouncedSearch || undefined,
    decision: filterDecision === "All" ? undefined : filterDecision,
    status: filterStatus === "All" ? undefined : filterStatus,
    sort,
  });

  const items = useMemo<MyExtractedDocumentQueue[]>(
    () => (data ? data.pages.flatMap((page) => page.data) : []),
    [data],
  );

  const hasFilters =
    !!search || filterDecision !== "All" || filterStatus !== "All" || sort !== "newest";

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const mobileScroll = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });
  const desktopScroll = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });

  function clearFilters() {
    setSearch("");
    setFilterDecision("All");
    setFilterStatus("All");
    setSort("newest");
  }

  function toggleSort() {
    setSort((prev) => (prev === "newest" ? "oldest" : "newest"));
  }

  // action targets (modals/handlers will be wired later)
  const [viewTarget, setViewTarget] = useState<MyExtractedDocumentQueue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MyExtractedDocumentQueue | null>(null);

  return {
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
    mobileScrollRef: mobileScroll.rootRef,
    mobileSentinelRef: mobileScroll.sentinelRef,
    desktopScrollRef: desktopScroll.rootRef,
    desktopSentinelRef: desktopScroll.sentinelRef,
    viewTarget,
    setViewTarget,
    deleteTarget,
    setDeleteTarget,
  };
}
