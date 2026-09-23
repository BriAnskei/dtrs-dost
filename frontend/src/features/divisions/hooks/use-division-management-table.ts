import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../hooks/user-infinite-scroll-sentinel";
import type { Division } from "../type/division.type";
import type { DivisionSort } from "../type/division-api.type";
import { mapDivisionsResponseToDivisions } from "../util/mapDivisionsResponseToDivisions";
import { useDivisions } from "./use-divisions";

const DEFAULT_SORT: DivisionSort = "name_asc";

export function useDivisionManagementTable() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DivisionSort>(DEFAULT_SORT);

  const [debouncedSearch] = useDebounce(search, 400);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDivisions({ search: debouncedSearch || undefined, sort });

  const divisions = useMemo<Division[]>(
    () =>
      data
        ? data.pages.flatMap((page) => mapDivisionsResponseToDivisions(page.data))
        : [],
    [data],
  );

  function loadMore() {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }

  // Separate sentinels: mobile cards and the desktop table are two distinct
  // scroll containers, each needs its own IntersectionObserver + root.
  const mobileScroll = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });
  const desktopScroll = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });

  // modal state
  const [viewTarget, setViewTarget] = useState<Division | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Division | null>(null);

  // TODO: divisionService has no update/delete endpoints yet — wire these to
  // updateDivisionMutation.mutate({ id, payload }) / deleteDivisionMutation.mutate(id)
  // once those land. Left as no-ops so the UI doesn't silently pretend to work.
  function handleRename(_id: string, _newName: string) {}

  function handleDelete() {
    setDeleteTarget(null);
  }

  const isFiltered = search.trim() !== "" || sort !== DEFAULT_SORT;

  function clearFilters() {
    setSearch("");
    setSort(DEFAULT_SORT);
  }

  return {
    isLoading,
    isError,
    error,
    divisions,
    search,
    setSearch,
    sort,
    setSort,
    isFiltered,
    clearFilters,
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
    handleRename,
    handleDelete,
  };
}
