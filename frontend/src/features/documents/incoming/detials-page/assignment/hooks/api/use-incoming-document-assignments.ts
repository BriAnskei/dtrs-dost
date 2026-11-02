import { useInfiniteQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../../../service/incoming-document-service";
import type { GetIncomingDocumentAssignmentsParams } from "../../types/incoming-document-assignment";

export const useIncomingDocumentAssignments = (
  incomingDocumentId: string,
  params?: GetIncomingDocumentAssignmentsParams,
) => {
  return useInfiniteQuery({
    queryKey: ["incoming-document-assignments", incomingDocumentId, params],

    queryFn: ({ pageParam }) =>
      IncomingDocumentService.getIncomingDocumentAssignments(
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
