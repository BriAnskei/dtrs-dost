import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../lib/api-error";
import { divisionService } from "../service/division.service";

export function useDeleteDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => divisionService.delete(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["divisions"],
      });

      toast.success("Division deleted successfully");
    },

    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to delete division"), {
        id: "delete-division-error",
      });
    },
  });
}
