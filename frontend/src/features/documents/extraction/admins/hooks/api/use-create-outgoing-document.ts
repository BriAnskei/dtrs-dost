import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { AdminDocumentUploadService } from "../../admin-document-upload-service";
import type { CreateOutgoingDocumentInput } from "../../types/create-outgoing-document";

export function useCreateOutgoingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOutgoingDocumentInput) =>
      AdminDocumentUploadService.createOutgoingDocument({
        ...payload,
        idempotencyKey: crypto.randomUUID(),
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["outgoing-documents"],
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create outgoing document."));
    },
  });
}
