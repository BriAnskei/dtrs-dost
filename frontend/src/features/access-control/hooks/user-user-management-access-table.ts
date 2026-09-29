import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useInfiniteScrollSentinel } from "../../../hooks/user-infinite-scroll-sentinel";
import type { AdminPermissions } from "../types/access-controll-types";
import {
  mapAdminPermissionsToGrantDto,
  mapUserPermissionToAdminAccount,
  mapUserPermissionToAdminPermissions,
} from "../util/mapUserPermission";
import { useRevokeUserManagementPermission } from "./api/use-revoke-user-management-permistion";
import { useSetUserManagementPermission } from "./api/use-set-user-management-permissions";
import { useUserManagementPermissions } from "./api/user-user-management-permissions";

const MASTER_KEY = "user_management.access";

export function useUserManagementAccessTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 400);

  const query = useUserManagementPermissions({
    name: debouncedSearch.trim() || undefined,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const permissions = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const admins = useMemo(
    () => permissions.map(mapUserPermissionToAdminAccount),
    [permissions],
  );

  const savedPermissionsByAdmin = useMemo(() => {
    const map: Record<string, AdminPermissions> = {};
    permissions.forEach((permission) => {
      map[permission.user_id] = mapUserPermissionToAdminPermissions(permission);
    });
    return map;
  }, [permissions]);

  // Optimistic local overrides so a save reflects immediately, without
  // waiting on a refetch of the whole list.
  const [overrides, setOverrides] = useState<Record<string, AdminPermissions>>({});

  const permissionsByAdmin = useMemo(
    () => ({ ...savedPermissionsByAdmin, ...overrides }),
    [savedPermissionsByAdmin, overrides],
  );

  // Which single admin row currently has a save/revoke in flight.
  const [savingAdminId, setSavingAdminId] = useState<string | null>(null);

  const { mutate: setUserManagementPermission } = useSetUserManagementPermission();
  const { mutate: revokeUserManagementPermission } = useRevokeUserManagementPermission();

  function clearSavingFor(adminId: string) {
    setSavingAdminId((current) => (current === adminId ? null : current));
  }

  function saveAdminPermissions(adminId: string, values: AdminPermissions) {
    const previous = permissionsByAdmin[adminId];

    setOverrides((prev) => ({ ...prev, [adminId]: values }));
    setSavingAdminId(adminId);

    if (previous[MASTER_KEY] && !values[MASTER_KEY]) {
      revokeUserManagementPermission(adminId, {
        onError: () => {
          setOverrides((prev) => ({ ...prev, [adminId]: previous }));
        },
        onSettled: () => clearSavingFor(adminId),
      });
      return;
    }

    const dto = mapAdminPermissionsToGrantDto(values, previous);

    setUserManagementPermission(
      { id: adminId, data: dto },
      {
        onError: () => {
          setOverrides((prev) => ({ ...prev, [adminId]: previous }));
        },
        onSettled: () => clearSavingFor(adminId),
      },
    );
  }

  // ── Infinite scroll ──
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { rootRef, sentinelRef } = useInfiniteScrollSentinel<HTMLDivElement>({
    onIntersect: loadMore,
    enabled: hasNextPage,
  });

  return {
    search,
    setSearch,
    admins,
    permissionsByAdmin,
    savingAdminId,
    saveAdminPermissions,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage,
    isFetchingNextPage,
    scrollRef: rootRef,
    sentinelRef,
  };
}
