import { useInfiniteQuery } from "@tanstack/react-query";
import { ExtractedDocumentQueueReceiverService } from "../../service/extracted-documents-queue-reciever-service";
import type { FindMyExtractedDocumentQueuesParams } from "../../types/extracted-queue-receiver-types";

type MyQueueFilters = Pick<
  FindMyExtractedDocumentQueuesParams,
  "file_name" | "decision" | "status" | "sort"
>;

export function useMyExtractedDocumentQueues(filters: MyQueueFilters) {
  return useInfiniteQuery({
    queryKey: ["my-extracted-document-queues", filters],

    queryFn: ({ pageParam }) =>
      ExtractedDocumentQueueReceiverService.findMy({
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
