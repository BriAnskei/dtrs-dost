import { useInfiniteQuery } from "@tanstack/react-query";
import { DivisionIncomingDocumentService } from "../../../../service/division-incoming-document-service";
import type { GetDivisionIncomingDocumentAssignmentsParams } from "../../types/division-incoming-document-assignment";

export const useDivisionIncomingDocumentAssignments = (
  incomingDocumentId: string,
  params?: GetDivisionIncomingDocumentAssignmentsParams,
) => {
  return useInfiniteQuery({
    queryKey: ["division-incoming-document-assignments", incomingDocumentId, params],

    queryFn: ({ pageParam }) =>
      DivisionIncomingDocumentService.getDivisionIncomingDocumentAssignments(
        incomingDocumentId,
        params,
        pageParam,
      ),

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    enabled: Boolean(incomingDocumentId),

    staleTime: 5 * 60_000,
  });
};
