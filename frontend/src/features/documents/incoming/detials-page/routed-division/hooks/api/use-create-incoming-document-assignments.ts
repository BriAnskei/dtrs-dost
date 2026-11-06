import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../../lib/api-error";
import { IncomingDocumentService } from "../../../../service/incoming-document-service";
import type { CreateIncomingDocumentAssignmentsDto } from "../../../../types/create-incoming-document-assignments-dto";

interface CreateAssignmentsVariables {
  incomingDocumentId: string;
  dto: CreateIncomingDocumentAssignmentsDto;
}
export function useCreateIncomingDocumentAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ incomingDocumentId, dto }: CreateAssignmentsVariables) =>
      IncomingDocumentService.createIncomingDocumentAssignments(incomingDocumentId, dto),
    onSuccess: (_, { incomingDocumentId, dto }) => {
      const count = dto.noticesOfActions.length;
      toast.success(
        count === 1 ? "Notice of action added" : `${count} notices of action added`,
      );

      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["incoming-documents", "details", incomingDocumentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["assigned-division-notice-counts", incomingDocumentId],
        }),
        ...(dto.incomingDocumentRoutingId
          ? [
              queryClient.invalidateQueries({
                queryKey: [
                  "incoming-document-assignments",
                  dto.incomingDocumentRoutingId,
                ],
              }),
            ]
          : []),
      ]);
    },
    onError: (error) => {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Failed to create assignment"), {
        id: "create-assignment-error",
      });
    },
  });
}
