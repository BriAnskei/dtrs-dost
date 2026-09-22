import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../lib/api-error";
import { userService } from "../services/user.service";
import type { UpdateUserPayload } from "../types/update-user.type";

export interface UpdateUserVariables {
  id: string;
  data: Partial<UpdateUserPayload>;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateUserVariables>({
    mutationFn: ({ id, data }) => userService.update(id, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      toast.success("User updated successfully.", {
        id: "update-user-success",
      });
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update user."), {
        id: "update-user-error",
      });
    },
  });
}
