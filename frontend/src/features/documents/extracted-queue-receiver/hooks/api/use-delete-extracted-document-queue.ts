import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../lib/api-error";
import { ExtractedDocumentQueueReceiverService } from "../../service/extracted-documents-queue-reciever-service";

export function useDeleteExtractedDocumentQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (queueId: string) =>
      ExtractedDocumentQueueReceiverService.delete(queueId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["extracted-document-queues"],
      });

      toast.success("Document queue deleted successfully");
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete document queue."));
    },
  });
}
