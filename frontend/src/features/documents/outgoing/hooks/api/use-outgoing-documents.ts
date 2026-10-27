import { useInfiniteQuery } from "@tanstack/react-query";
import { outgoingDocumentService } from "../../service/outgoing-document.service";
import type { FindOutgoingDocumentsParams } from "../../types/outgoing-document.type";

type OutgoingDocumentFilters = Pick<
  FindOutgoingDocumentsParams,
  "search" | "dateField" | "startDate" | "endDate" | "sort"
>;

export function useOutgoingDocuments(filters: OutgoingDocumentFilters) {
  return useInfiniteQuery({
    queryKey: ["outgoing-documents", filters],
    queryFn: ({ pageParam }) =>
      outgoingDocumentService.findAll({
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
