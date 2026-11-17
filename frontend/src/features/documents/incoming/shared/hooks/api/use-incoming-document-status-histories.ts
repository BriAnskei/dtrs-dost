import { useInfiniteQuery } from "@tanstack/react-query";
import { IncomingStatusService } from "../../../service/incoming-status-service";
import type { IncomingDocumentStatusHistoryParams } from "../../types/incoming-document-status-history.types";

type StatusHistoryFilters = Pick<
  IncomingDocumentStatusHistoryParams,
  "limit" | "startDate" | "endDate"
> & {
  incomingDocumentId: string;
};

export const useIncomingDocumentStatusHistories = ({
  incomingDocumentId,
  limit = 20,
  startDate,
  endDate,
}: StatusHistoryFilters) => {
  return useInfiniteQuery({
    queryKey: [
      "incoming-document-status-histories",
      incomingDocumentId,
      { limit, startDate, endDate },
    ],

    queryFn: ({ pageParam }) =>
      IncomingStatusService.getIncomingDocumentStatusHistories(
        {
          limit,
          startDate,
          endDate,
          cursor: pageParam,
        },
        incomingDocumentId,
      ),

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    enabled: Boolean(incomingDocumentId),

    staleTime: 5 * 60 * 1000,

    retry: 1,
  });
};
