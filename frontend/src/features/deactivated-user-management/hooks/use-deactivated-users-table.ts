import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../hooks/user-infinite-scroll-sentinel";
import { ROLE_ID_MAP } from "../../user-management/types/create-user.type";
import type {
  SortDirection,
  SystemUser,
  UserRole,
} from "../../user-management/types/user.type";
import { mapUsersResponseToSystemUsers } from "../../user-management/utils/mapUserResponseToSystemUser";
import { useDeactivatedUsers } from "./api/use-deactivated-users";

export function useDeactivatedUserTable() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Exclude<UserRole, "Super Admin"> | "All">(
    "All",
  );
  const [sort, setSort] = useState<SortDirection>("newest");

  const [debouncedSearch] = useDebounce(search, 400);
  const role_id = filterRole === "All" ? undefined : ROLE_ID_MAP[filterRole];

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDeactivatedUsers({ name: debouncedSearch || undefined, role_id, sort });

  const users = useMemo<SystemUser[]>(
    () =>
      data ? data.pages.flatMap((page) => mapUsersResponseToSystemUsers(page.data)) : [],
    [data],
  );

  const hasFilters = !!search || filterRole !== "All" || sort !== "newest";

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  function clearFilters() {
    setSearch("");
    setFilterRole("All");
    setSort("newest");
  }

  function toggleSort() {
    setSort((prev) => (prev === "newest" ? "oldest" : "newest"));
  }

  // modal state
  const [reactivateTarget, setReactivateTarget] = useState<SystemUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);

  return {
    isLoading,
    isError,
    error,
    filtered: users,
    hasFilters,
    clearFilters,
    search,
    setSearch,
    filterRole,
    setFilterRole,
    sort,
    toggleSort,
    hasNextPage,
    isFetchingNextPage,
    mobileScrollRef: mobileScroll.rootRef,
    mobileSentinelRef: mobileScroll.sentinelRef,
    desktopScrollRef: desktopScroll.rootRef,
    desktopSentinelRef: desktopScroll.sentinelRef,
    reactivateTarget,
    setReactivateTarget,
    deleteTarget,
    setDeleteTarget,
  };
}
