import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IncomingStatusService } from "../../../service/incoming-status-service";
import type { UpdateIncomingDocumentStatusVariables } from "../../types/update-incoming-document-status.type";

export const useUpdateIncomingDocumentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateIncomingDocumentStatusVariables) =>
      IncomingStatusService.updateIncomingDocumentStatus(id, payload),

    onSuccess: async (_, variables) => {
      const { id } = variables;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["incoming-document", id],
        }),

        queryClient.invalidateQueries({
          queryKey: ["incoming-document-status-histories", id],
        }),

        queryClient.invalidateQueries({
          queryKey: ["incoming-documents"],
        }),
      ]);
    },
  });
};
