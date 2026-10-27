import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../lib/api-error";
import { DisabledUserService } from "../../service/disabled-user.service";

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => DisabledUserService.delete(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["disabled-users"],
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
