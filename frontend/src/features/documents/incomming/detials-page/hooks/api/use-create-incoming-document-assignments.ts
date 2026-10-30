import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../../service/incoming-document-service";
import type { CreateIncomingDocumentAssignmentsDto } from "../../../types/create-incoming-document-assignments-dto";

interface CreateAssignmentsVariables {
  incomingDocumentId: string;
  dto: CreateIncomingDocumentAssignmentsDto;
}

export function useCreateIncomingDocumentAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ incomingDocumentId, dto }: CreateAssignmentsVariables) =>
      IncomingDocumentService.createIncomingDocumentAssignments(incomingDocumentId, dto),

    onSuccess: (_, { incomingDocumentId, dto }) =>
      Promise.all([
        // Document details (overview progress)
        queryClient.invalidateQueries({
          queryKey: ["incoming-document", "details", incomingDocumentId],
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
      ]),
  });
}
