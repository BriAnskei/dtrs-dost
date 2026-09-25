import { useInfiniteQuery } from "@tanstack/react-query";
import type { FindUsersParams } from "../../user-management/types/user.type";
import { DeactivatedUserService } from "../service/deactivated-user.service";

type DeactivatedUserFilters = Pick<FindUsersParams, "name" | "role_id" | "sort">;

export function useDeactivatedUsers(filters: DeactivatedUserFilters) {
  return useInfiniteQuery({
    queryKey: ["users", "deactivated", filters],
    queryFn: ({ pageParam }) =>
      DeactivatedUserService.findAllDeactivated({
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
