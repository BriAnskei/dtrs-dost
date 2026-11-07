import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../../../../hooks/user-infinite-scroll-sentinel";
import type { AssignmentStatus } from "../../../types/assignment-types";
import type {
  AssignmentSort,
  GetIncomingDocumentAssignmentsParams,
  IncomingDocumentAssignment,
  OfficeType,
} from "../types/incoming-document-assignment";
import { useIncomingDocumentAssignments } from "./api/use-incoming-document-assignments";

export type StatusFilter = "ALL" | AssignmentStatus;
export type OfficeFilter = "ALL" | OfficeType;

export const STATUS_FILTERS: readonly { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "ONGOING", label: "Ongoing" },
  { id: "COMPLETE", label: "Completed" },
];

export const OFFICE_FILTERS: readonly { id: OfficeFilter; label: string }[] = [
  { id: "ALL", label: "All offices" },
  { id: "MAIN", label: "Main office" },
  { id: "DIVISION", label: "Divisions" },
];

const SEARCH_DEBOUNCE_MS = 400;

/** Only MAIN notices that are ONGOING can be completed from the admin tab. */
export function canCompleteHere(a: IncomingDocumentAssignment) {
  return a.office_type === "MAIN" && a.status === "ONGOING";
}

/**
 * State for the Action Assignments tab.
 *
 * The list is cursor-paginated and loaded by an infinite-scroll sentinel, so
 * only the loaded pages are in memory. Search, status, office and sort
 * therefore go to the API; each combination is its own cached query.
 *
 * Everything the tab needs to render lives here (filters, search box, the
 * "Add new" and "Delete" modals, the inline "Complete" panel, view flags), so
 * the component is markup only.
 */
export function useActionAssignmentsTab(incomingDocumentId: string) {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [office, setOffice] = useState<OfficeFilter>("ALL");
  const [sort, setSort] = useState<AssignmentSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<IncomingDocumentAssignment | null>(null);
  // Id of the row whose inline "Complete" panel is open. One at a time.
  const [completingId, setCompletingId] = useState<string | null>(null);

  const searchId = `${useId()}-search`;
  const searchRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // The row's delete button that opened the modal, so focus can go back to it.
  const deleteTriggerRef = useRef<HTMLElement | null>(null);
  // The row's Complete button that opened the panel, so focus can go back to it.
  const completeTriggerRef = useRef<HTMLElement | null>(null);

  const [debouncedSearch] = useDebounce(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  // Emptying the box applies immediately, so old results never linger for a
  // whole debounce cycle after the user deletes their query.
  const search = searchInput.trim() === "" ? "" : debouncedSearch;

  const params = useMemo<GetIncomingDocumentAssignmentsParams>(
    () => ({
      sort,
      search: search || undefined,
      status: status === "ALL" ? undefined : status,
      officeType: office === "ALL" ? undefined : office,
    }),
    [sort, search, status, office],
  );

  const query = useIncomingDocumentAssignments(incomingDocumentId, params);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  // If your PaginatedResponse names the array something other than `data`
  // (e.g. `items`), this is the only line to change.
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

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

  // A changed search/filter/sort is a different list: start from the top.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `params` is the trigger, not a value read inside the effect.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [params, scrollRef]);

  const toggleSort = useCallback(
    () => setSort((s) => (s === "newest" ? "oldest" : "newest")),
    [],
  );

  const hasActiveFilters =
    status !== "ALL" || office !== "ALL" || searchInput.trim() !== "";

  const clearFilters = useCallback(() => {
    setStatus("ALL");
    setOffice("ALL");
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

  /* ------------------------------ add modal ------------------------------- */

  const openAdd = useCallback(() => setIsAddOpen(true), []);

  const closeAdd = useCallback(() => {
    setIsAddOpen(false);
    addButtonRef.current?.focus(); // hand focus back to the trigger
  }, []);

  /* ------------------------------ delete modal ---------------------------- */

  // Only PENDING and ONGOING rows can be deleted. The row button is disabled
  // for COMPLETE, and the modal hook guards it again.
  const requestDelete = useCallback((assignment: IncomingDocumentAssignment) => {
    if (assignment.status === "COMPLETE") return;
    deleteTriggerRef.current = document.activeElement as HTMLElement | null;
    setAssignmentToDelete(assignment);
  }, []);

  /** Cancel: hand focus back to the row button that opened the modal. */
  const closeDelete = useCallback(() => {
    setAssignmentToDelete(null);
    deleteTriggerRef.current?.focus();
  }, []);

  /** Success: the row is about to disappear, so focus the list instead. */
  const handleDeleted = useCallback(() => {
    setAssignmentToDelete(null);
    scrollRef.current?.focus();
  }, [scrollRef]);

  /* ------------------------- inline complete panel ------------------------ */

  // Opening a panel on another row replaces the current one (and its draft).
  const requestComplete = useCallback((assignment: IncomingDocumentAssignment) => {
    if (!canCompleteHere(assignment)) return;
    completeTriggerRef.current = document.activeElement as HTMLElement | null;
    setCompletingId(assignment.id);
  }, []);

  /** Cancel: hand focus back to the Complete button that opened the panel. */
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
  // only when the document has no assignments at all (nothing to filter).
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
    office,
    setOffice,
    sort,
    toggleSort,
    hasActiveFilters,
    clearFilters,

    searchId,
    searchRef,
    clearSearch,
    handleSearchKeyDown,

    addButtonRef,
    isAddOpen,
    openAdd,
    closeAdd,

    /** The assignment awaiting delete confirmation, or null when the modal is closed. */
    assignmentToDelete,
    requestDelete,
    closeDelete,
    handleDeleted,

    /** Id of the row with its inline Complete panel open, or null. */
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
