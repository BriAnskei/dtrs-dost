import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../hooks/user-infinite-scroll-sentinel";
import { ROLE_ID_MAP, type UserFormState } from "../types/create-user.type";
import type { SortDirection, SystemUser, UserRole } from "../types/user.type";
import { mapUsersResponseToSystemUsers } from "../utils/mapUserResponseToSystemUser";
import { removeHyphens } from "../utils/string";
import { useUsers } from "./use-users";

export function useUserManagementTable() {
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
  } = useUsers({ name: debouncedSearch || undefined, role_id, sort });

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

  function toFormState(user: SystemUser): UserFormState {
    return {
      name: user.name,
      position: user.position,
      role: user.role,
      email: user.email,
      contact: removeHyphens(user.contact),
      division: user.divisionName,
      password: "",
    };
  }

  // modal state
  const [addModal, setAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SystemUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SystemUser | null>(null);
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null);

  return {
    isLoading,
    isError,
    error,
    filtered: users,
    hasFilters,
    toFormState,
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
    addModal,
    setAddModal,
    editTarget,
    setEditTarget,
    deactivateTarget,
    setDeactivateTarget,
    resetTarget,
    setResetTarget,
  };
}
