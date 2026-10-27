import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../../lib/api-error";
import { IncomingDocumentService } from "../../../service/incoming-document-service";
import type { AssignIncomingDocumentToDivisionDto } from "../../../types/assign-incoming-document-to-dto-division.type";

export const useAssignIncomingDocumentToDivision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AssignIncomingDocumentToDivisionDto) =>
      IncomingDocumentService.assignIncomingDocumentToDivision(dto),

    onSuccess: async () => {
      toast.success("Document assigned to division successfully.");

      queryClient.invalidateQueries({
        queryKey: ["assigned-division-notice-counts"],
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to assign division"), {
        id: "assign-division-error",
      });
    },
  });
};
