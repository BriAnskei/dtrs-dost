import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { AdminDocumentUploadService } from "../../admin-document-upload-service";

export function useCreateOutgoingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AdminDocumentUploadService.createOutgoingDocument,

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
