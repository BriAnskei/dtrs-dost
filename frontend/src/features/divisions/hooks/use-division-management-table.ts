import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../hooks/user-infinite-scroll-sentinel";
import type { Division } from "../type/division.type";
import type { DivisionSort } from "../type/division-api.type";
import { mapDivisionsResponseToDivisions } from "../util/mapDivisionsResponseToDivisions";
import { useDivisions } from "./use-divisions";
import { useUpdateDivisionName } from "./use-update-division-name";

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

  const updateDivisionNameMutation = useUpdateDivisionName();

  // TODO: divisionService has no delete endpoint yet — wire this to
  // deleteDivisionMutation.mutate(id) once it lands.
  function handleDelete() {
    setDeleteTarget(null);
  }

  function handleRename(id: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;

    updateDivisionNameMutation.mutate({
      id,
      dto: { division_name: trimmed },
    });
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
    isRenaming: updateDivisionNameMutation.isPending,
    renamingId: updateDivisionNameMutation.variables?.id,
    handleDelete,
  };
}
