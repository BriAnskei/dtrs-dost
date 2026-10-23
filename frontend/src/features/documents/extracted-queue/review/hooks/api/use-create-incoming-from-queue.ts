import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { ExtractedQueueService } from "../../../service/extracted-queue.service";
import type { CreateIncomingFromQueueVariables } from "../../../types/create-incoming-from-queue.types";

export function useCreateIncomingFromQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queueId, dto }: CreateIncomingFromQueueVariables) =>
      ExtractedQueueService.createIncomingFromQueue(queueId, dto, crypto.randomUUID()),

    onSuccess: async () => {
      toast.success("Incoming document created successfully.");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["incoming-documents"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["extracted-document-queue"],
        }),
      ]);
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create incoming document."));
    },
  });
}
