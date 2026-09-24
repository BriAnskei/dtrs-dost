import { useMutation, useQueryClient } from "@tanstack/react-query";
import { divisionService } from "../service/division.service";
import type { UpdateDivisionDto } from "../type/update-divition.type";

export function useUpdateDivisionName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDivisionDto }) =>
      divisionService.updateName(id, dto),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["divisions"],
      });
    },
  });
}
