import { useInfiniteQuery } from "@tanstack/react-query";
import { divisionService } from "../service/division.service";
import type { FindDivisionsParams } from "../type/division-api.type";

type DivisionFilters = Pick<FindDivisionsParams, "search" | "sort">;

export function useDivisions(filters: DivisionFilters) {
  return useInfiniteQuery({
    queryKey: ["divisions", filters],

    queryFn: ({ pageParam }) =>
      divisionService.findAll({
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
