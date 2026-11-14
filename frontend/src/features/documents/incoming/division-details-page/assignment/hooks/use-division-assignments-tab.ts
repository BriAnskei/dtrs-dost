import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../../../../hooks/user-infinite-scroll-sentinel";
import {
  STATUS_FILTERS,
  type StatusFilter,
} from "../../../detials-page/assignment/hooks/use-action-assignment-tab";
import type {
  AssignmentSort,
  IncomingDocumentAssignment,
} from "../../../detials-page/assignment/types/incoming-document-assignment";
import type { GetDivisionIncomingDocumentAssignmentsParams } from "../types/division-incoming-document-assignment";
import { useDivisionIncomingDocumentAssignments } from "./api/use-division-incoming-document-assignments";
import {
  canStartInDivision,
  useDivisionStartAssignment,
} from "./use-division-start-assignment-modal";

export { canStartInDivision, STATUS_FILTERS, type StatusFilter };

const SEARCH_DEBOUNCE_MS = 400;

/**
 * Every row here already belongs to this division, so unlike the admin tab
 * there is no MAIN/DIVISION check: any ONGOING notice can have its action
 * submitted.
 */
export function canCompleteInDivision(a: IncomingDocumentAssignment) {
  return a.status === "ONGOING";
}

/**
 * State for the division Assignments tab.
 *
 * Same idea as the admin tab hook, minus what a division can't do:
 * - no office filter (the endpoint is already scoped to this division)
 * - no "Add new" modal
 * - no delete modal
 * The inline "Submit action" panel is kept (UI only for now). The
 * PENDING -> ONGOING "Start" confirm flow lives in `useDivisionStartAssignment`
 * and is returned as `start`.
 */
export function useDivisionAssignmentsTab(incomingDocumentId: string) {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<AssignmentSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  // Id of the row whose inline "Submit action" panel is open. One at a time.
  const [completingId, setCompletingId] = useState<string | null>(null);

  const searchId = `${useId()}-search`;
  const searchRef = useRef<HTMLInputElement>(null);
  // The row's Submit button that opened the panel, so focus can go back to it.
  const completeTriggerRef = useRef<HTMLElement | null>(null);

  const [debouncedSearch] = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  // Emptying the box applies immediately, so old results never linger for a
  // whole debounce cycle after the user deletes their query.
  const search = searchInput.trim() === "" ? "" : debouncedSearch;

  const params = useMemo<GetDivisionIncomingDocumentAssignmentsParams>(
    () => ({
      sort,
      search: search || undefined,
      status: status === "ALL" ? undefined : status,
    }),
    [sort, search, status],
  );

  const query = useDivisionIncomingDocumentAssignments(incomingDocumentId, params);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Paused while previous results are shown during a refetch, and after a
  // failed page load (the user taps "Try again" instead of looping retries).
  const { rootRef: scrollRef, sentinelRef } = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled:
      Boolean(hasNextPage) && !query.isPlaceholderData && !query.isFetchNextPageError,
  });

  // A changed search/filter/sort is a different list: start from the top.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `params` is the trigger, not a value read inside the effect.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [params, scrollRef]);

  const toggleSort = useCallback(
    () => setSort((s) => (s === "newest" ? "oldest" : "newest")),
    [],
  );

  const hasActiveFilters = status !== "ALL" || searchInput.trim() !== "";

  const clearFilters = useCallback(() => {
    setStatus("ALL");
    setSearchInput("");
  }, []);

  /* ------------------------------ search box ------------------------------ */

  const clearSearch = useCallback(() => {
    setSearchInput("");
    searchRef.current?.focus();
  }, []);

  /** Escape empties the box instead of bubbling up. */
  const handleSearchKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape" && searchInput) {
        e.preventDefault();
        setSearchInput("");
      }
    },
    [searchInput],
  );

  /* ------------------------- start (PENDING -> ONGOING) ------------------- */

  const start = useDivisionStartAssignment({
    incomingDocumentId,
    items,
    listRef: scrollRef,
  });

  /* ------------------------- inline submit-action panel ------------------- */

  // Opening a panel on another row replaces the current one (and its draft).
  const requestComplete = useCallback((assignment: IncomingDocumentAssignment) => {
    if (!canCompleteInDivision(assignment)) return;
    completeTriggerRef.current = document.activeElement as HTMLElement | null;
    setCompletingId(assignment.id);
  }, []);

  /** Cancel: hand focus back to the Submit button that opened the panel. */
  const closeComplete = useCallback(() => {
    setCompletingId(null);
    completeTriggerRef.current?.focus();
  }, []);

  /** Success: the row becomes COMPLETE and loses its button, so focus the list. */
  const handleCompleted = useCallback(() => {
    setCompletingId(null);
    scrollRef.current?.focus();
  }, [scrollRef]);

  /* ------------------------------ view flags ------------------------------ */

  const fullError = query.isError && items.length === 0;

  // The toolbar stays put while a filter change reloads the list. It's hidden
  // only when this division has no assignments on the document at all.
  const showToolbar =
    hasActiveFilters || (!query.isLoading && !fullError && items.length > 0);

  const showFooter = !query.isLoading && !fullError && items.length > 0;

  const countNoun = hasActiveFilters ? "match" : "assignment";
  const countLabel =
    items.length === 1 ? countNoun : hasActiveFilters ? "matches" : "assignments";

  return {
    query,
    items,
    /** True while the previous results are shown during a refetch (filter/search change). */
    isPlaceholderData: query.isPlaceholderData,
    hasMore: Boolean(hasNextPage),
    isLoadingMore: isFetchingNextPage,
    loadMoreFailed: query.isFetchNextPageError,
    loadMore,
    scrollRef,
    sentinelRef,

    searchInput,
    setSearchInput,
    /** The trimmed term actually applied to the list. */
    search,
    status,
    setStatus,
    sort,
    toggleSort,
    hasActiveFilters,
    clearFilters,

    searchId,
    searchRef,
    clearSearch,
    handleSearchKeyDown,

    /** The Start confirm flow: `target`, `isPending`, `request`, `cancel`, `confirm`. */
    start,

    /** Id of the row with its inline Submit-action panel open, or null. */
    completingId,
    requestComplete,
    closeComplete,
    handleCompleted,

    fullError,
    showToolbar,
    showFooter,
    /** "assignment(s)" or "match(es)", already pluralised for `items.length`. */
    countLabel,
  };
}
