import { useInfiniteQuery } from "@tanstack/react-query";
import { DeactivatedUserService } from "../../service/deactivated-user.service";
import type { FindDeactivatedUsersParams } from "../../types/deactivated-user.types";

type DeactivatedUserFilters = Pick<
  FindDeactivatedUsersParams,
  "name" | "role_id" | "sort"
>;

export function useDeactivatedUsers(filters: DeactivatedUserFilters) {
  return useInfiniteQuery({
    queryKey: ["deactivated-users", filters],
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
