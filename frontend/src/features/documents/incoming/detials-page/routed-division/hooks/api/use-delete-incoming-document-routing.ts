import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../../lib/api-error";
import { IncomingDocumentService } from "../../../../service/incoming-document-service";

interface DeleteRoutingParams {
  routingId: string;
  incomingDocumentId: string;
}

export const useDeleteIncomingDocumentRouting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routingId }: DeleteRoutingParams) =>
      IncomingDocumentService.deleteIncomingDocumentRouting(routingId),

    onSuccess: async (_, { incomingDocumentId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["assigned-division-notice-counts", incomingDocumentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["incoming-documents", "details", incomingDocumentId],
        }),
      ]);

      toast.success("Routing deleted successfully.");
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
};
