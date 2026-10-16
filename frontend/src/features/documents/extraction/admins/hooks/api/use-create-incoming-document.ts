import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { AdminDocumentUploadService } from "../../admin-document-upload-service";

export function useCreateIncomingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AdminDocumentUploadService.createIncomingDocument,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["incoming-documents"],
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create incoming document."));
    },
  });
}
