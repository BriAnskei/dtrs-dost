import { useInfiniteQuery } from "@tanstack/react-query";
import { userService } from "../services/user.service";
import type { FindUsersParams } from "../types/user.type";

type UserFilters = Pick<FindUsersParams, "name" | "role_id" | "sort">;

export function useUsers(filters: UserFilters) {
  return useInfiniteQuery({
    queryKey: ["users", filters],
    queryFn: ({ pageParam }) =>
      userService.findAll({
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
