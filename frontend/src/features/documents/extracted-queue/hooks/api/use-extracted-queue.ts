import { useInfiniteQuery } from "@tanstack/react-query";
import { ExtractedQueueService } from "../../service/extracted-queue.service";
import type { FindExtractedDocumentQueuesParams } from "../../types/extracted-document-queue.types";

type ExtractedDocumentQueueFilters = Pick<
  FindExtractedDocumentQueuesParams,
  "uploader_name" | "unknown_uploader" | "decision" | "sort"
>;

export function useExtractedDocumentQueues(filters: ExtractedDocumentQueueFilters) {
  return useInfiniteQuery({
    queryKey: ["extracted-document-queues", filters],

    queryFn: ({ pageParam }) =>
      ExtractedQueueService.findAll({
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
