import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { IncomingDocumentService } from "../../../service/incoming-document-service";
import type { CompleteIncomingDocumentAssignmentDto } from "../../types/incoming-document-assignment";

interface CompleteAssignmentParams {
  assignmentId: string;
  dto: CompleteIncomingDocumentAssignmentDto;
}

export const useCompleteIncomingDocumentAssignment = (incomingDocumentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, dto }: CompleteAssignmentParams) =>
      IncomingDocumentService.completeAssignment(assignmentId, dto),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["incoming-document-assignments", incomingDocumentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["incoming-document", incomingDocumentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["incoming-documents"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["assigned-division-notice-counts", incomingDocumentId],
        }),
      ]);

      toast.success("Assignment completed successfully.");
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
};
