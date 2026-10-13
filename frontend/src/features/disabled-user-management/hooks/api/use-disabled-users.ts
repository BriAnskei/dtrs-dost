import { useInfiniteQuery } from "@tanstack/react-query";
import { DisabledUserService } from "../../service/disabled-user.service";
import type { FindDisabledUsersParams } from "../../types/disabled-user.types";

type DisabledUserFilters = Pick<
  FindDisabledUsersParams,
  "name" | "role_id" | "sort"
>;

export function useDisabledUsers(filters: DisabledUserFilters) {
  return useInfiniteQuery({
    queryKey: ["disabled-users", filters],
    queryFn: ({ pageParam }) =>
      DisabledUserService.findAllDisabled({
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
