import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../lib/api-error";
import { DeactivatedUserService } from "../../service/deactivated-user.service";

export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => DeactivatedUserService.reactivate(userId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["deactivated-users"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["divisions"],
      });

      toast.success("User reactivated successfully");
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to reactivate user"), {
        id: "reactivate-user-error",
      });
    },
  });
}
