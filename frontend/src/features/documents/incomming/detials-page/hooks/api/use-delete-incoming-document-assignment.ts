import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { IncomingDocumentService } from "../../../service/incoming-document-service";

export function useDeleteIncomingDocumentAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      incomingDocumentId,
      assignmentId,
    }: {
      incomingDocumentId: string;
      assignmentId: string;
      routingId: string;
    }) => IncomingDocumentService.deleteAssignment(incomingDocumentId, assignmentId),

    onSuccess: (_, { incomingDocumentId, routingId }) => {
      toast.success("Assignment deleted successfully.");

      queryClient.invalidateQueries({
        queryKey: ["incoming-documents", "details", incomingDocumentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["assigned-division-notice-counts", incomingDocumentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["incoming-document-assignments", routingId],
      });
    },

    onError: (error) => {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to delete assignment"), {
        id: "delete-assignment-error",
      });
    },
  });
}
