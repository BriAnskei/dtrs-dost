import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../../../hooks/user-infinite-scroll-sentinel";
import type { Decision } from "../../../extraction/types/extraction-types";
import type {
  ExtractedDocumentQueue,
  ExtractedDocumentQueueSort,
} from "../../types/extracted-document-queue.types";
import { useExtractedDocumentQueues } from "./api/use-extracted-queue";

const DEFAULT_SORT: ExtractedDocumentQueueSort = "newest";

export function useExtractedQueueTable() {
  // ── Filters ──────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState<Decision | undefined>(undefined);
  const [unknownUploader, setUnknownUploaderState] = useState(false);
  const [sort, setSort] = useState<ExtractedDocumentQueueSort>(DEFAULT_SORT);

  const [debouncedSearch] = useDebounce(search, 400);

  function setUnknownUploader(value: boolean) {
    setUnknownUploaderState(value);
    if (value) setSearch(""); // a name filter can never match "no uploader"
  }

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useExtractedDocumentQueues({
    uploader_name: debouncedSearch.trim() || undefined,
    unknown_uploader: unknownUploader ? true : undefined,
    decision,
    sort,
  });

  const queues = useMemo<ExtractedDocumentQueue[]>(
    () => (data ? data.pages.flatMap((page) => page.data) : []),
    [data],
  );

  // ── Infinite scroll ──────────────────────────────────────
  function loadMore() {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }

  const mobileScroll = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });
  const desktopScroll = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });

  // ── Filter helpers ───────────────────────────────────────
  const isFiltered =
    search.trim() !== "" ||
    decision !== undefined ||
    unknownUploader ||
    sort !== DEFAULT_SORT;

  // Drives the Filter button badge and the chips (search and sort are visible on their own).
  const activeFilterCount = (decision ? 1 : 0) + (unknownUploader ? 1 : 0);

  function clearFacetFilters() {
    setDecision(undefined);
    setUnknownUploaderState(false);
  }

  function clearFilters() {
    setSearch("");
    setDecision(undefined);
    setUnknownUploaderState(false);
    setSort(DEFAULT_SORT);
  }

  return {
    isLoading,
    isError,
    error,
    queues,
    hasNextPage,
    isFetchingNextPage,
    mobileScrollRef: mobileScroll.rootRef,
    mobileSentinelRef: mobileScroll.sentinelRef,
    desktopScrollRef: desktopScroll.rootRef,
    desktopSentinelRef: desktopScroll.sentinelRef,

    // filters
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
    clearFilters,
  };
}
