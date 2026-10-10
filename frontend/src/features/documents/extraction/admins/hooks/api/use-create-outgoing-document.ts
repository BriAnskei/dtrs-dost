import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { AdminsUploadService } from "../../admins-upload-service";

export function useCreateOutgoingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AdminsUploadService.createOutgoingDocument,

    onSuccess: async (result) => {
      toast.success("Outgoing document created successfully.", {
        description: `Document code: ${result.code}`,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["outgoing-documents"],
        }),
      ]);
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create outgoing document."));
    },
  });
}
