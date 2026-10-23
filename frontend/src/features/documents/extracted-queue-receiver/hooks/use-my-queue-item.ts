import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useLocation } from "react-router";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type { MyExtractedDocumentQueue } from "../types/extracted-queue-receiver-types";

type QueueListData = InfiniteData<PaginatedResponse<MyExtractedDocumentQueue>>;

/**
 * Resolves the queue item for the details page from data the list already fetched:
 *  1. the row passed through router state when clicking "View" (survives a refresh,
 *     because react-router keeps state in history),
 *  2. otherwise the cached list pages.
 * Returns null when neither has it (for example a link opened in a new tab).
 */
export function useMyQueueItem(id: string): MyExtractedDocumentQueue | null {
  const location = useLocation();
  const queryClient = useQueryClient();

  return useMemo(() => {
    const fromState = (location.state as { item?: MyExtractedDocumentQueue } | null)
      ?.item;
    if (fromState && fromState.id === id) return fromState;

    const cached = queryClient.getQueriesData<QueueListData>({
      queryKey: ["my-extracted-document-queues"],
    });

    for (const [, data] of cached) {
      const found = data?.pages
        .flatMap((page) => page.data)
        .find((item) => item.id === id);
      if (found) return found;
    }

    return null;
  }, [id, location.state, queryClient]);
}
