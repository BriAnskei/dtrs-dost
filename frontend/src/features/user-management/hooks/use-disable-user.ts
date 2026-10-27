import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../lib/api-error";
import { userService } from "../services/user.service";

export function useDisableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.disable(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["disabled-users"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["divisions"],
      });

      toast.success("User disabled successfully");
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to disable user"));
    },
  });
}
