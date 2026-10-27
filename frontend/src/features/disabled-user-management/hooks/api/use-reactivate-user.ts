import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../lib/api-error";
import { DisabledUserService } from "../../service/disabled-user.service";

export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => DisabledUserService.reactivate(userId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["disabled-users"],
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
