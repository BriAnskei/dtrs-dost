import { useMutation, useQueryClient } from "@tanstack/react-query";
import { divisionService } from "../service/division.service";

export function useDeleteDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => divisionService.delete(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["divisions"],
      });
    },
  });
}
