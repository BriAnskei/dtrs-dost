import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../../hooks/user-infinite-scroll-sentinel";
import type { Decision } from "../../extraction/types/extraction-types";
import type {
  ExtractedDocumentQueue,
  ExtractedDocumentQueueSort,
} from "../types/extracted-document-queue.types";
import { useExtractedDocumentQueues } from "./api/use-extracted-queue";

const DEFAULT_SORT: ExtractedDocumentQueueSort = "newest";

/** The two review actions an admin can take on a queue row. */
export type QueueAction = Extract<Decision, "ACCEPT" | "INVALID">;

export interface PendingQueueAction {
  action: QueueAction;
  /** Ids the action will be applied to (already filtered to eligible rows). */
  ids: string[];
}

export function useExtractedQueueTable() {
  // ── Filters ──────────────────────────────────────────────
  const [search, setSearchState] = useState("");
  const [decision, setDecisionState] = useState<Decision | undefined>(undefined);
  const [unknownUploader, setUnknownUploaderState] = useState(false);
  const [sort, setSortState] = useState<ExtractedDocumentQueueSort>(DEFAULT_SORT);

  const [debouncedSearch] = useDebounce(search, 400);

  // ── Selection ────────────────────────────────────────────
  // Selection UI (checkboxes, bulk bar) only exists while `selectionMode` is on.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const startSelecting = useCallback(() => setSelectionMode(true), []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Changing any filter changes the visible rows, so a selection made under the
  // old filters would silently target rows the admin can no longer see.
  // (Selection mode itself stays on, so "filter, then select" works.)
  function setSearch(value: string) {
    setSearchState(value);
    clearSelection();
  }
  function setDecision(value: Decision | undefined) {
    setDecisionState(value);
    clearSelection();
  }
  function setUnknownUploader(value: boolean) {
    setUnknownUploaderState(value);
    if (value) setSearchState(""); // a name filter can never match "no uploader"
    clearSelection();
  }
  function setSort(value: ExtractedDocumentQueueSort) {
    setSortState(value);
    clearSelection();
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

  // ── Selection (derived) ──────────────────────────────────
  // Derived from `queues` so ids that disappeared after a refetch never count.
  const selectedQueues = useMemo(
    () => queues.filter((q) => selectedIds.has(q.id)),
    [queues, selectedIds],
  );

  const selectedCount = selectedQueues.length;
  const allLoadedSelected = queues.length > 0 && selectedCount === queues.length;
  const someSelected = selectedCount > 0 && !allLoadedSelected;

  // A row already ACCEPTed can't be accepted again; same for INVALID.
  const acceptableIds = useMemo(
    () => selectedQueues.filter((q) => q.decision !== "ACCEPT").map((q) => q.id),
    [selectedQueues],
  );
  const invalidatableIds = useMemo(
    () => selectedQueues.filter((q) => q.decision !== "INVALID").map((q) => q.id),
    [selectedQueues],
  );

  // How many loaded rows each "Select by decision" option would pick.
  const loadedCounts = useMemo(() => {
    const counts: Record<Decision, number> = { ACCEPT: 0, REVIEW: 0, INVALID: 0 };
    for (const q of queues) counts[q.decision] += 1;
    return counts;
  }, [queues]);

  function isSelected(id: string) {
    return selectedIds.has(id);
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllLoaded() {
    setSelectedIds(allLoadedSelected ? new Set() : new Set(queues.map((q) => q.id)));
  }

  /** Menu shortcut: enter selection mode with every loaded row selected. */
  function selectAllLoaded() {
    setSelectionMode(true);
    setSelectedIds(new Set(queues.map((q) => q.id)));
  }

  /** Menu shortcut: enter selection mode with only the loaded rows of one decision selected. */
  function selectByDecision(target: Decision) {
    setSelectionMode(true);
    setSelectedIds(new Set(queues.filter((q) => q.decision === target).map((q) => q.id)));
  }

  // ── Actions & modals (UI only for now) ───────────────────
  const [pendingAction, setPendingAction] = useState<PendingQueueAction | null>(null);
  const [viewTarget, setViewTarget] = useState<ExtractedDocumentQueue | null>(null);

  // Escape leaves selection mode — unless a modal is open (it owns Escape then).
  // Popovers stop Escape from bubbling, so closing one won't land here.
  useEffect(() => {
    if (!selectionMode || pendingAction || viewTarget) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") exitSelectionMode();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectionMode, pendingAction, viewTarget, exitSelectionMode]);

  function requestAction(action: QueueAction, ids: string[]) {
    if (ids.length === 0) return;
    setPendingAction({ action, ids });
  }

  function requestBulkAccept() {
    requestAction("ACCEPT", acceptableIds);
  }

  function requestBulkInvalidate() {
    requestAction("INVALID", invalidatableIds);
  }

  function closePendingAction() {
    setPendingAction(null);
  }

  function confirmPendingAction() {
    // TODO: call the accept / invalidate mutation with pendingAction.ids,
    // then invalidate the ["extracted-document-queues"] query.
    setPendingAction(null);
    exitSelectionMode(); // action done → back to the clean, checkbox-free table
  }

  // ── Filter helpers ───────────────────────────────────────
  const isFiltered =
    search.trim() !== "" ||
    decision !== undefined ||
    unknownUploader ||
    sort !== DEFAULT_SORT;

  // Drives the Filter button badge and the chips (search and sort are visible on their own).
  const activeFilterCount = (decision ? 1 : 0) + (unknownUploader ? 1 : 0);

  function clearFacetFilters() {
    setDecisionState(undefined);
    setUnknownUploaderState(false);
    clearSelection();
  }

  function clearFilters() {
    setSearchState("");
    setDecisionState(undefined);
    setUnknownUploaderState(false);
    setSortState(DEFAULT_SORT);
    clearSelection();
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

    // selection
    selectionMode,
    startSelecting,
    exitSelectionMode,
    isSelected,
    toggleOne,
    toggleAllLoaded,
    selectAllLoaded,
    selectByDecision,
    clearSelection,
    selectedCount,
    allLoadedSelected,
    someSelected,
    loadedCounts,
    acceptableCount: acceptableIds.length,
    invalidatableCount: invalidatableIds.length,

    // actions / modals
    pendingAction,
    requestAction,
    requestBulkAccept,
    requestBulkInvalidate,
    closePendingAction,
    confirmPendingAction,
    viewTarget,
    setViewTarget,
  };
}
