import { useQuery } from "@tanstack/react-query";
import { ExtractedDocumentQueueReceiverService } from "../../service/extracted-documents-queue-reciever-service";

/**
 * Fetches the approved incoming document or the invalidation response of a queue.
 * Pass `enabled = false` for PENDING queues: the backend returns null for them,
 * so the request is skipped entirely.
 */
export function useGetIncomingDocumentByQueue(queueId: string, enabled = true) {
  return useQuery({
    queryKey: ["receiver-queue-details", queueId],
    queryFn: () => ExtractedDocumentQueueReceiverService.findQueueDetails(queueId),
    enabled: Boolean(queueId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
