import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { ExtractedQueueService } from "../../../service/extracted-queue.service";
import type { InvalidateExtractedQueuePayload } from "../../../types/invalidation-types";

export function useInvalidateExtractedDocumentQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, response }: InvalidateExtractedQueuePayload) =>
      ExtractedQueueService.invalidate({ id, response }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["extracted-document-queues"],
      });

      toast.success("Document queue invalidated successfully.");
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to invalidate queue"), {
        id: "invalidate-queue-error",
      });
    },
  });
}
