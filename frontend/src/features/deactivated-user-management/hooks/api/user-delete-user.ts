import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../lib/api-error";
import { DeactivatedUserService } from "../../service/deactivated-user.service";

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => DeactivatedUserService.delete(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["deactivated-users"],
      });

      toast.success("User deleted  successfully");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to delete user"), {
        id: "delete-user-error",
      });
    },
  });
}
