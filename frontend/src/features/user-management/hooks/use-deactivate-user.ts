import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../lib/api-error";
import { userService } from "../services/user.service";

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.deactivate(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["deactivated-users"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["divisions"],
      });

      toast.success("User deactivated successfully");
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to deactivate user"));
    },
  });
}
