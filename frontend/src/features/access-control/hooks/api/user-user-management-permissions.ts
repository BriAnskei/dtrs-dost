import { useInfiniteQuery } from "@tanstack/react-query";
import { UserPermissionService } from "../../service/user-permission-service";
import type { FindUserManagementPermissionsParams } from "../../types/user-management-permission-types";

type UserManagementPermissionFilters = Pick<FindUserManagementPermissionsParams, "name">;

export function useUserManagementPermissions(filters: UserManagementPermissionFilters) {
  return useInfiniteQuery({
    queryKey: ["user-management-permissions", filters],

    queryFn: ({ pageParam }) =>
      UserPermissionService.findAllUserManagementPermission({
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
