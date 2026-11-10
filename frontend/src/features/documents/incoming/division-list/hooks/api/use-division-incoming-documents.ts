import { useInfiniteQuery } from "@tanstack/react-query";
import { DivisionIncomingDocumentService } from "../../../service/division-incoming-document-service";
import type { FindDivisionIncomingDocumentsParams } from "../../types/division-incoming-document.type";

type DivisionIncomingDocumentFilters = Pick<
  FindDivisionIncomingDocumentsParams,
  "search" | "status" | "startDate" | "endDate" | "sort"
>;

export function useDivisionIncomingDocuments(filters: DivisionIncomingDocumentFilters) {
  return useInfiniteQuery({
    queryKey: ["division-incoming-documents", filters],

    initialPageParam: undefined as string | undefined,

    queryFn: ({ pageParam }) =>
      DivisionIncomingDocumentService.findAll({
        ...filters,
        cursor: pageParam,
      }),

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
