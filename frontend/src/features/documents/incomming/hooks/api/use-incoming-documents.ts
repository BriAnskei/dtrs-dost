import { useInfiniteQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../service/incoming-document-service";
import type { FindIncomingDocumentsParams } from "../../types/incoming-document.type";

type IncomingDocumentFilters = Pick<
  FindIncomingDocumentsParams,
  "search" | "status" | "dateField" | "startDate" | "endDate" | "sort"
>;

export function useIncomingDocuments(filters: IncomingDocumentFilters) {
  return useInfiniteQuery({
    queryKey: ["incoming-documents", filters],

    initialPageParam: undefined as string | undefined,

    queryFn: ({ pageParam }) =>
      IncomingDocumentService.findAll({
        ...filters,
        cursor: pageParam,
      }),

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
