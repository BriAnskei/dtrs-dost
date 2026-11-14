import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DivisionIncomingDocumentService } from "../../../../service/division-incoming-document-service";

interface StartIncomingDocumentAssignmentParams {
  assignmentId: string;
  incomingDocumentId: string;
}

export const useStartIncomingDocumentAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId }: StartIncomingDocumentAssignmentParams) =>
      DivisionIncomingDocumentService.startAssignment(assignmentId),

    onSuccess: async (_, variables) => {
      const { incomingDocumentId } = variables;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["division-incoming-document-assignments", incomingDocumentId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["division-incoming-document-details", incomingDocumentId],
        }),
      ]);

      toast.success("Assignment started successfully.");
    },
  });
};
